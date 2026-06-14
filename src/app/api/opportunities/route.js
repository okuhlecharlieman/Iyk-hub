import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';
import { handleApiError } from 'lib/api/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 30;
const EXTERNAL_OPPORTUNITIES_API_URL =
  process.env.SMART_JOB_PORTAL_OPPORTUNITIES_API_URL ||
  'https://multi-tenant-smart-job-application.vercel.app/api/opportunities';
const EXTERNAL_JOBS_API_URL =
  process.env.SMART_JOB_PORTAL_JOBS_API_URL ||
  'https://multi-tenant-smart-job-application.vercel.app/api/jobs/public';
const EXTERNAL_OPPORTUNITIES_SOURCE_LABEL = 'Smart Job Portal';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
};

const normalizeExternalOpportunity = (opportunity) => {
  if (!opportunity || typeof opportunity !== 'object' || !opportunity.id) return null;

  const title = typeof opportunity.title === 'string' ? opportunity.title.trim() : '';
  const org = typeof opportunity.company === 'string' ? opportunity.company.trim() : '';
  const description = typeof opportunity.description === 'string' ? opportunity.description.trim() : '';

  if (!title || !org || !description) return null;

  const tags = Array.isArray(opportunity.tags)
    ? opportunity.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
    : [];

  const status = ['pending', 'approved', 'rejected'].includes(opportunity.status)
    ? opportunity.status
    : 'approved';

  return {
    id: `smart-job-portal:${opportunity.id}`,
    externalId: opportunity.id,
    externalSource: 'smart-job-portal',
    sourceLabel: EXTERNAL_OPPORTUNITIES_SOURCE_LABEL,
    readOnly: true,
    tenantId: opportunity.tenantId || 'platform',
    title,
    org,
    company: org,
    contactName: typeof opportunity.contactName === 'string' ? opportunity.contactName.trim() : '',
    contactEmail: typeof opportunity.contactEmail === 'string' ? opportunity.contactEmail.trim() : '',
    description,
    value: typeof opportunity.value === 'number' ? opportunity.value : null,
    status,
    tags,
    link: '',
    createdAt: opportunity.createdAt || null,
    updatedAt: opportunity.updatedAt || null,
  };
};

const normalizeExternalJob = (job) => {
  if (!job || typeof job !== 'object' || !job.id) return null;

  const title = typeof job.title === 'string' ? job.title.trim() : '';
  const org = typeof job.company === 'string' ? job.company.trim() : (typeof job.companyName === 'string' ? job.companyName.trim() : '');
  const description = typeof job.description === 'string' ? job.description.trim() : '';

  if (!title || !description) return null;

  const tags = Array.isArray(job.tags)
    ? job.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
    : [job.department, job.location, job.type, ...(job.skills || [])].filter(Boolean);

  return {
    id: `smart-job-portal:job:${job.id}`,
    externalId: job.id,
    externalSource: 'smart-job-portal',
    sourceLabel: EXTERNAL_OPPORTUNITIES_SOURCE_LABEL,
    readOnly: true,
    tenantId: job.tenantId || 'platform',
    title,
    org: org || 'Company',
    company: org || 'Company',
    contactName: '',
    contactEmail: '',
    description,
    value: null,
    status: 'approved',
    tags,
    link: job.applyUrl || '',
    department: job.department || null,
    location: job.location || null,
    type: job.type || null,
    salary: job.salary || null,
    skills: job.skills || [],
    requirements: job.requirements || [],
    source: 'job',
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
  };
};

const fetchExternalOpportunities = async ({ limit, search = '' } = {}) => {
  const url = new URL(EXTERNAL_OPPORTUNITIES_API_URL);
  url.searchParams.set('status', 'approved');
  url.searchParams.set('limit', String(Math.min(Math.max(limit || 12, 1), 100)));
  if (search) url.searchParams.set('search', search);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`External opportunities fetch failed with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map(normalizeExternalOpportunity).filter(Boolean);
  } catch (error) {
    console.warn('External opportunities fetch failed:', error?.message || error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
};

const fetchExternalJobs = async ({ limit, search = '' } = {}) => {
  const url = new URL(EXTERNAL_JOBS_API_URL);
  url.searchParams.set('limit', String(Math.min(Math.max(limit || 12, 1), 100)));
  if (search) url.searchParams.set('search', search);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`External jobs fetch failed with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
    return jobs.map(normalizeExternalJob).filter(Boolean);
  } catch (error) {
    console.warn('External jobs fetch failed:', error?.message || error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
};

const sortOpportunitiesByCreatedAt = (items) => [...items].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

const getRoleForUid = async (uid) => {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) return 'user';
  return userDoc.data()?.role || 'user';
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:get', limit: 90, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const role = await getRoleForUid(uid);

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '12', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 12 : rawLimit, 1), MAX_LIMIT);
    let cursor = searchParams.get('cursor');
    const search = (searchParams.get('search') || '').trim();
    const includeExternal = !cursor && searchParams.get('includeExternal') !== 'false';

    const db = admin.firestore();

    if (role === 'admin') {
      let queryRef = db.collection('opportunities').orderBy('createdAt', 'desc').limit(limitN);

      if (cursor) {
        const cursorSnap = await db.collection('opportunities').doc(cursor).get();
        if (cursorSnap.exists) {
          queryRef = db.collection('opportunities').orderBy('createdAt', 'desc').startAfter(cursorSnap).limit(limitN);
        }
      }

      const snap = await queryRef.get();
      const serializeTs = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        if (typeof val.toMillis === 'function') return new Date(val.toMillis()).toISOString();
        return null;
      };
      const opportunities = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: serializeTs(data.createdAt),
          updatedAt: serializeTs(data.updatedAt),
          expiresAt: serializeTs(data.expiresAt),
          deletionScheduledAt: serializeTs(data.deletionScheduledAt),
        };
      });
      const [externalOpportunities, externalJobs] = includeExternal
        ? await Promise.all([fetchExternalOpportunities({ limit: limitN, search }), fetchExternalJobs({ limit: limitN, search })])
        : [[], []];
      const lastDoc = snap.docs[snap.docs.length - 1];
      const nextCursor = snap.docs.length === limitN ? lastDoc.id : null;

      const seenExtIds = new Set(externalOpportunities.map((o) => o.externalId));
      const dedupedJobs = externalJobs.filter((j) => !seenExtIds.has(j.externalId));

      return NextResponse.json({ opportunities: sortOpportunitiesByCreatedAt([...opportunities, ...externalOpportunities, ...dedupedJobs]), nextCursor });
    }

    // Only load approved opportunities in the main paged query.
    // For non-admins, also include the user's own pending opportunities (first page only).
    const approvedQuery = db
      .collection('opportunities')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(limitN);

    let queryRef = approvedQuery;
    if (cursor) {
      const cursorSnap = await db.collection('opportunities').doc(cursor).get();
      if (cursorSnap.exists) {
        queryRef = approvedQuery.startAfter(cursorSnap);
      }
    }

    const approvedSnap = await queryRef.get();
    const serializeTimestamp = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (typeof val.toDate === 'function') return val.toDate().toISOString();
      if (typeof val.toMillis === 'function') return new Date(val.toMillis()).toISOString();
      return null;
    };
    const serializeOpportunity = (doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        expiresAt: serializeTimestamp(data.expiresAt),
        deletionScheduledAt: serializeTimestamp(data.deletionScheduledAt),
      };
    };

    const approvedOpportunities = approvedSnap.docs.map(serializeOpportunity);
    const now = new Date();
    const visibleApproved = approvedOpportunities.filter((opp) => !opp.expiresAt || new Date(opp.expiresAt) > now);

    let opportunities = visibleApproved;

    // Include the user's own pending opportunities on the first page only.
    if (!cursor) {
      try {
        const pendingSnap = await db
          .collection('opportunities')
          .where('ownerId', '==', uid)
          .where('status', '==', 'pending')
          .get();

        const pendingOpportunities = pendingSnap.docs.map(serializeOpportunity);

        // Merge and de-dupe
        const combined = [...pendingOpportunities, ...visibleApproved];
        const seen = new Set();
        opportunities = combined
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          })
          .slice(0, limitN);
      } catch (pendingError) {
        console.warn('Failed to fetch pending opportunities for user:', pendingError?.message);
        opportunities = visibleApproved;
      }
    }

    const lastDoc = approvedSnap.docs[approvedSnap.docs.length - 1];
    const nextCursor = approvedSnap.docs.length === limitN ? lastDoc.id : null;

    const [externalOpportunities, externalJobs] = includeExternal
      ? await Promise.all([fetchExternalOpportunities({ limit: limitN, search }), fetchExternalJobs({ limit: limitN, search })])
      : [[], []];
    const seenExtIds = new Set(externalOpportunities.map((o) => o.externalId));
    const dedupedJobs = externalJobs.filter((j) => !seenExtIds.has(j.externalId));
    const mergedOpportunities = sortOpportunitiesByCreatedAt([...opportunities, ...externalOpportunities, ...dedupedJobs]);

    return NextResponse.json({ opportunities: mergedOpportunities, nextCursor });
  } catch (error) {
    return handleApiError(error, 'Error in /api/opportunities:');
  }
}

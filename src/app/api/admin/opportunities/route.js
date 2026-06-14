import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, listAllOpportunities } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const allowedOpportunityStatuses = new Set(['pending', 'approved', 'rejected']);

const validateOpportunityUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['id', 'status']);

  if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'id', message: 'Opportunity id is required.' }]);
  }

  if (typeof payload.status !== 'string' || !allowedOpportunityStatuses.has(payload.status)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'status', message: 'Status must be one of pending, approved, or rejected.' }]);
  }

  return { id: payload.id.trim(), status: payload.status };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:opportunities:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 50 : rawLimit, 1), 200);
    const cursor = searchParams.get('cursor');

    const adminDb = admin.firestore();
    let queryRef = adminDb.collection('opportunities').orderBy('createdAt', 'desc').limit(limitN);

    if (cursor) {
      const cursorSnap = await adminDb.collection('opportunities').doc(cursor).get();
      if (cursorSnap.exists) {
        queryRef = queryRef.startAfter(cursorSnap);
      }
    }

    const snap = await queryRef.get();
    const toISO = (val) => {
      if (!val) return null;
      if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
      if (val instanceof Date) return val.toISOString();
      if (typeof val === 'string') return val;
      if (val._seconds != null || val.seconds != null) {
        const seconds = Number(val._seconds ?? val.seconds);
        return new Date(seconds * 1000).toISOString();
      }
      return null;
    };

    const opportunities = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
        expiresAt: toISO(data.expiresAt),
        deletionScheduledAt: toISO(data.deletionScheduledAt),
      };
    });

    const filtered = search
      ? opportunities.filter((opp) => {
          const haystack = [opp.title, opp.org, opp.description, ...(Array.isArray(opp.tags) ? opp.tags : [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(search);
        })
      : opportunities;

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = snap.docs.length === limitN ? lastDoc?.id : null;

    return NextResponse.json({ success: true, opportunities: filtered, nextCursor });
  } catch (error) {
    return handleApiError(error, 'Error in GET /api/admin/opportunities');
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:opportunities:update', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    const payload = await parseJsonBody(request);
    const { id, status } = validateOpportunityUpdatePayload(payload);

    const adminDb = admin.firestore();
    const oppRef = adminDb.collection('opportunities').doc(id);
    const oppSnap = await oppRef.get();
    const updatePayload = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'approved') {
      const opp = oppSnap.exists ? oppSnap.data() : null;
      if (opp?.expiresAt) {
        const expiresAt = opp.expiresAt.toDate ? opp.expiresAt.toDate() : new Date(opp.expiresAt);
        let deletionDate = new Date(expiresAt.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (expiresAt <= new Date()) {
          deletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        }
        updatePayload.deletionScheduledAt = admin.firestore.Timestamp.fromDate(deletionDate);
      } else {
        updatePayload.deletionScheduledAt = admin.firestore.FieldValue.delete();
      }
      updatePayload.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.approvedBy = actor.uid;
    } else {
      updatePayload.approvedAt = admin.firestore.FieldValue.delete();
      updatePayload.approvedBy = admin.firestore.FieldValue.delete();
      updatePayload.deletionScheduledAt = admin.firestore.FieldValue.delete();
    }

    await oppRef.update(updatePayload);

    await logAdminAction({
      request,
      actor,
      action: 'opportunity.status.updated',
      targetType: 'opportunity',
      targetId: id,
      metadata: { status },
    });

    const snap = await oppRef.get();
    const title = snap.exists ? snap.data().title : null;

    return NextResponse.json({ success: true, message: 'Opportunity updated successfully', id, title });
  } catch (error) {
    return handleApiError(error, 'Error in PUT /api/admin/opportunities');
  }
}

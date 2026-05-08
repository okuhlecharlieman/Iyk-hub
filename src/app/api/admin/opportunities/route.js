import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, listAllOpportunities } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

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
  try {
    await authenticate(request);
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const adminDb = admin.firestore();
    const snap = await adminDb.collection('opportunities').orderBy('createdAt', 'desc').get();
    const opportunities = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.toISOString?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.toISOString?.() || data.updatedAt || null,
        expiresAt: data.expiresAt?.toDate?.toISOString?.() || data.expiresAt || null,
        deletionScheduledAt: data.deletionScheduledAt?.toDate?.toISOString?.() || data.deletionScheduledAt || null,
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

    return NextResponse.json({ success: true, opportunities: filtered });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in GET /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    console.error('Error in PUT /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

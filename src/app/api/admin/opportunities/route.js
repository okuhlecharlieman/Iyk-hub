import { NextResponse } from 'next/server';
import { authenticate, listAllOpportunities, updateOpportunity } from '../../../../lib/firebase/admin';
<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
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

=======

>>>>>>> main
export async function GET(request) {
  try {
    await authenticate(request);
    const opportunities = await listAllOpportunities();
    return NextResponse.json(opportunities);
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in GET /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:opportunities:update', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const actor = await authenticate(request);
    const payload = await parseJsonBody(request);
    const { id, status } = validateOpportunityUpdatePayload(payload);

    await updateOpportunity(id, { status });

    await logAdminAction({
      request,
      actor,
      action: 'opportunity.status.updated',
      targetType: 'opportunity',
      targetId: id,
      metadata: { status },
    });

=======
  try {
    await authenticate(request);
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    await updateOpportunity(id, { status });

>>>>>>> main
    const adminDb = (await import('firebase-admin')).firestore();
    const snap = await adminDb.collection('opportunities').doc(id).get();
    const title = snap.exists ? snap.data().title : null;

    return NextResponse.json({ message: 'Opportunity updated successfully', id, title });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
=======
>>>>>>> main
    console.error('Error in PUT /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

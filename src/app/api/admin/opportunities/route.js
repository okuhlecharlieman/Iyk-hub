import { NextResponse } from 'next/server';
import { listAllOpportunities, updateOpportunity } from '../../../../lib/firebase/admin';

// All admin endpoints must validate the caller's ID token and ensure the
// caller is an admin (checks Firestore `users/{uid}` role).
async function requireAdmin(request) {
  const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
  if (!idToken) return { ok: false, status: 401, body: { error: 'Unauthorized' } };

  try {
    await import('../../../../lib/firebase/admin'); // ensure admin SDK init helper available
    const admin = await import('firebase-admin');
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      return { ok: false, status: 403, body: { error: 'Forbidden' } };
    }
    return { ok: true, admin, callerUid };
  } catch (err) {
    console.error('Admin auth check failed:', err?.message || err);
    return { ok: false, status: 401, body: { error: 'Invalid auth token' } };
  }
}

export async function GET(request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json(check.body, { status: check.status });

  try {
    const opportunities = await listAllOpportunities();
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error in GET /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json(check.body, { status: check.status });

  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    await updateOpportunity(id, { status });

    // Return the updated opportunity title for friendly UI notifications
    const adminDb = (await import('firebase-admin')).firestore();
    const snap = await adminDb.collection('opportunities').doc(id).get();
    const title = snap.exists ? snap.data().title : null;

    return NextResponse.json({ message: 'Opportunity updated successfully', id, title });
  } catch (error) {
    console.error('Error in PUT /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

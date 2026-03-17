import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'institutions:me:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const snap = await admin.firestore().collection('institutionAccounts').where('ownerUid', '==', uid).orderBy('createdAt', 'desc').limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ account: null });
    }

    const doc = snap.docs[0];
    return NextResponse.json({ account: { id: doc.id, ...doc.data() } });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/institutions/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

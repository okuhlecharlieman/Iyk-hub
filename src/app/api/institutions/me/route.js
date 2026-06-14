import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

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
    return handleApiError(error, 'Error in /api/institutions/me:');
  }
}

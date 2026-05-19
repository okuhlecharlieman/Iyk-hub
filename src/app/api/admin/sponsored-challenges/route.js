import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored-challenges:list', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const db = admin.firestore();
    const snapshot = await db.collection('sponsoredChallenges').orderBy('createdAt', 'desc').limit(50).get();

    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      deadline: doc.data().deadline?.toDate?.()?.toISOString() || doc.data().deadline,
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString() || doc.data().approvedAt,
    }));

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error('Error fetching sponsored challenges for admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
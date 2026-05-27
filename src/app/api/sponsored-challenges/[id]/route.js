import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
export const dynamic = 'force-dynamic';

const serializeChallenge = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.toISOString?.() || data.createdAt || null,
    deadline: data.deadline?.toDate?.toISOString?.() || data.deadline || null,
  };
};

export async function GET(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenges:item', limit: 120, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();
    const challengeDoc = await db.collection('sponsoredChallenges').doc(params.id).get();

    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    }

    const challenge = serializeChallenge(challengeDoc);
    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('Error fetching sponsored challenge:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

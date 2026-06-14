import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'survey:submit', limit: 5, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const { answers } = await request.json();
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'answers object is required' }, { status: 400 });
    }

    const db = admin.firestore();

    await db.collection('surveyResponses').add({
      uid,
      answers,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Error in /api/survey/submit:');
  }
}

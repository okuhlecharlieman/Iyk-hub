import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:survey:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const db = admin.firestore();
    const snap = await db.collection('surveyResponses').orderBy('createdAt', 'desc').limit(200).get();

    const responses = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        answers: data.answers || {},
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });

    // Fetch user display names
    const uids = [...new Set(responses.map((r) => r.uid).filter(Boolean))];
    const userNames = {};
    if (uids.length > 0) {
      const chunks = [];
      for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
      await Promise.all(chunks.map(async (chunk) => {
        const userSnap = await db.collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get();
        userSnap.forEach((uDoc) => {
          const uData = uDoc.data();
          userNames[uDoc.id] = uData.displayName || uData.email || null;
        });
      }));
    }

    const enrichedResponses = responses.map((r) => ({
      ...r,
      userName: userNames[r.uid] || null,
    }));

    return NextResponse.json({ success: true, responses: enrichedResponses });
  } catch (error) {
    return handleApiError(error, 'Error in GET /api/admin/survey:');
  }
}

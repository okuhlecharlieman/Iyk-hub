import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../lib/api/validation';
import { enforceRateLimit } from '../../../lib/api/rate-limit';
import { logAdminAction, logDataAccess } from '../../../lib/api/logging';

const validateCreatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'description', 'challengeType', 'deadline', 'prizeDescription', 'sponsorName', 'sponsorEmail', 'budgetCents']);

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0 || payload.title.length > 100) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'title', message: 'Title is required and must be 1-100 characters.' }]);
  }

  if (typeof payload.description !== 'string' || payload.description.trim().length === 0 || payload.description.length > 1000) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'Description is required and must be 1-1000 characters.' }]);
  }

  if (typeof payload.challengeType !== 'string' || !['coding', 'design', 'writing', 'other'].includes(payload.challengeType)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'challengeType', message: 'Challenge type must be one of: coding, design, writing, other.' }]);
  }

  const deadline = new Date(payload.deadline);
  if (isNaN(deadline.getTime()) || deadline <= new Date()) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'deadline', message: 'Deadline must be a valid future date.' }]);
  }

  if (typeof payload.prizeDescription !== 'string' || payload.prizeDescription.trim().length === 0 || payload.prizeDescription.length > 200) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'prizeDescription', message: 'Prize description is required and must be 1-200 characters.' }]);
  }

  if (typeof payload.sponsorName !== 'string' || payload.sponsorName.trim().length === 0 || payload.sponsorName.length > 100) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'sponsorName', message: 'Sponsor name is required and must be 1-100 characters.' }]);
  }

  if (typeof payload.sponsorEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.sponsorEmail)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'sponsorEmail', message: 'Valid sponsor email is required.' }]);
  }

  if (typeof payload.budgetCents !== 'number' || payload.budgetCents < 1000 || payload.budgetCents > 100000) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'budgetCents', message: 'Budget must be between 1000 and 100000 cents ($10-$1000).' }]);
  }

  return {
    title: payload.title.trim(),
    description: payload.description.trim(),
    challengeType: payload.challengeType,
    deadline: deadline.toISOString(),
    prizeDescription: payload.prizeDescription.trim(),
    sponsorName: payload.sponsorName.trim(),
    sponsorEmail: payload.sponsorEmail.trim(),
    budgetCents: payload.budgetCents,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenges:list', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50);

    const db = admin.firestore();
    let query = db.collection('sponsoredChallenges').orderBy('createdAt', 'desc').limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection('sponsoredChallenges').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const challenges = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      deadline: doc.data().deadline?.toDate?.()?.toISOString() || doc.data().deadline,
    }));

    const nextCursor = snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : null;

    return NextResponse.json({ challenges, nextCursor });
  } catch (error) {
    console.error('Error fetching sponsored challenges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenges:create', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const validatedData = validateCreatePayload(payload);

    const db = admin.firestore();
    const challengeRef = db.collection('sponsoredChallenges').doc();
    const challengeData = {
      ...validatedData,
      id: challengeRef.id,
      creatorUid: uid,
      status: 'pending', // pending admin approval
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await challengeRef.set(challengeData);

    // Log the creation
    await logDataAccess({
      request,
      userId: uid,
      accessType: 'write',
      resourceType: 'sponsoredChallenge',
      resourceId: challengeRef.id,
    });

    return NextResponse.json({ challenge: { id: challengeRef.id, ...challengeData } }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    console.error('Error creating sponsored challenge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
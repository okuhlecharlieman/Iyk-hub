import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticateAndGetUid } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { logAdminAction, logDataAccess } from '../../../../../lib/api/logging';

const serializeSubmission = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.toISOString?.() || data.updatedAt || null,
  };
};

const validateSubmissionPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'description', 'submissionUrl']);

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0 || payload.title.length > 150) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'title', message: 'Title is required and must be 1-150 characters.' }]);
  }

  if (typeof payload.description !== 'string' || payload.description.trim().length === 0 || payload.description.length > 1000) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'Description is required and must be 1-1000 characters.' }]);
  }

  if (payload.submissionUrl && typeof payload.submissionUrl !== 'string') {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'submissionUrl', message: 'Submission URL must be a string.' }]);
  }

  const submissionUrl = payload.submissionUrl?.trim() || '';
  if (submissionUrl && !/^https?:\/\//i.test(submissionUrl)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'submissionUrl', message: 'Submission URL must be a valid http(s) link.' }]);
  }

  return {
    title: payload.title.trim(),
    description: payload.description.trim(),
    submissionUrl,
  };
};

const validateModerationPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['submissionId', 'status', 'score', 'judgeNotes']);

  if (typeof payload.submissionId !== 'string' || payload.submissionId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'submissionId', message: 'Submission ID is required.' }]);
  }

  const allowedStatuses = ['submitted', 'shortlisted', 'accepted', 'rejected'];
  if (payload.status && !allowedStatuses.includes(payload.status)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'status', message: 'Status must be one of submitted, shortlisted, accepted or rejected.' }]);
  }

  if (payload.score !== undefined && payload.score !== null) {
    const scoreNumber = Number(payload.score);
    if (Number.isNaN(scoreNumber) || scoreNumber < 0 || scoreNumber > 100) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'score', message: 'Score must be a number between 0 and 100.' }]);
    }
  }

  if (payload.judgeNotes && typeof payload.judgeNotes !== 'string') {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'judgeNotes', message: 'Judge notes must be a string.' }]);
  }

  return {
    submissionId: payload.submissionId.trim(),
    status: payload.status,
    score: payload.score !== undefined && payload.score !== null ? Number(payload.score) : undefined,
    judgeNotes: payload.judgeNotes?.trim() || '',
  };
};

const fetchChallenge = async (db, challengeId) => {
  const challengeSnap = await db.collection('sponsoredChallenges').doc(challengeId).get();
  return challengeSnap.exists ? { id: challengeSnap.id, ...challengeSnap.data() } : null;
};

const fetchUserProfile = async (db, uid) => {
  const userSnap = await db.collection('users').doc(uid).get();
  return userSnap.exists ? userSnap.data() : null;
};

export async function GET(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenge-submissions:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const db = admin.firestore();
    const challenge = await fetchChallenge(db, params.id);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    }

    const userProfile = await fetchUserProfile(db, uid);
    const isAdmin = userProfile?.role === 'admin';
    const isCreator = uid === challenge.creatorUid;

    let submissions = [];
    let ownSubmission = null;

    if (isAdmin || isCreator) {
      const submissionsSnap = await db.collection('sponsoredChallengeSubmissions')
        .where('challengeId', '==', params.id)
        .orderBy('createdAt', 'desc')
        .get();

      submissions = submissionsSnap.docs.map(serializeSubmission);
    }

    const ownSubmissionSnap = await db.collection('sponsoredChallengeSubmissions').doc(`${params.id}_${uid}`).get();
    if (ownSubmissionSnap.exists) {
      ownSubmission = serializeSubmission(ownSubmissionSnap);
    }

    await logDataAccess({
      request,
      userId: uid,
      accessType: 'read',
      resourceType: 'sponsoredChallengeSubmissions',
      resourceId: params.id,
      isAuthorized: true,
    });

    return NextResponse.json({ ownSubmission, submissions, isAdmin, isCreator });
  } catch (error) {
    if (error?.code === 401) {
      return NextResponse.json({ error: error.message || 'Not authenticated.' }, { status: 401 });
    }
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenge-submissions:create', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const db = admin.firestore();
    const challenge = await fetchChallenge(db, params.id);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    }

    if (challenge.status !== 'approved') {
      return NextResponse.json({ error: 'This challenge is not open for submissions yet.' }, { status: 400 });
    }

    const deadline = new Date(challenge.deadline);
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      return NextResponse.json({ error: 'The submission deadline has passed.' }, { status: 400 });
    }

    const payload = await parseJsonBody(request);
    const submission = validateSubmissionPayload(payload);

    const userProfile = await fetchUserProfile(db, uid);
    const submissionRef = db.collection('sponsoredChallengeSubmissions').doc(`${params.id}_${uid}`);
    const existingSubmission = await submissionRef.get();

    const submissionData = {
      id: submissionRef.id,
      challengeId: params.id,
      userId: uid,
      title: submission.title,
      description: submission.description,
      submissionUrl: submission.submissionUrl,
      displayName: userProfile?.displayName || null,
      email: userProfile?.email || null,
      status: 'submitted',
      score: null,
      judgeNotes: '',
      createdAt: existingSubmission.exists ? existingSubmission.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await submissionRef.set(submissionData, { merge: true });

    await logDataAccess({
      request,
      userId: uid,
      accessType: 'write',
      resourceType: 'sponsoredChallengeSubmissions',
      resourceId: submissionRef.id,
      isAuthorized: true,
    });

    return NextResponse.json({ submission: { ...submissionData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, { status: existingSubmission.exists ? 200 : 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401) {
      return NextResponse.json({ error: error.message || 'Not authenticated.' }, { status: 401 });
    }
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'sponsored-challenge-submissions:moderate', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const db = admin.firestore();
    const challenge = await fetchChallenge(db, params.id);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    }

    const userProfile = await fetchUserProfile(db, uid);
    const isAdmin = userProfile?.role === 'admin';
    const isCreator = uid === challenge.creatorUid;

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Not authorized to moderate submissions.' }, { status: 403 });
    }

    const payload = await parseJsonBody(request);
    const moderation = validateModerationPayload(payload);

    const submissionRef = db.collection('sponsoredChallengeSubmissions').doc(moderation.submissionId);
    const submissionSnap = await submissionRef.get();

    if (!submissionSnap.exists || submissionSnap.data().challengeId !== params.id) {
      return NextResponse.json({ error: 'Submission not found for this challenge.' }, { status: 404 });
    }

    const updatePayload = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      judgedBy: uid,
    };

    if (moderation.status) updatePayload.status = moderation.status;
    if (moderation.score !== undefined) updatePayload.score = moderation.score;
    if (moderation.judgeNotes) updatePayload.judgeNotes = moderation.judgeNotes;

    await submissionRef.update(updatePayload);
    const updatedSubmission = await submissionRef.get();

    await logAdminAction({
      request,
      actor: { uid },
      action: 'moderate_submission',
      targetType: 'sponsoredChallengeSubmission',
      targetId: updatedSubmission.id,
      metadata: { challengeId: params.id, status: moderation.status, score: moderation.score },
    });

    return NextResponse.json({ submission: serializeSubmission(updatedSubmission) });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401) {
      return NextResponse.json({ error: error.message || 'Not authenticated.' }, { status: 401 });
    }
    console.error('Error moderating submission:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

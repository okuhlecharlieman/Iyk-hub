import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { enqueueModerationItem, screenTextContent } from '../../../../lib/api/moderation';

const validateOpportunityPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'org', 'link', 'description', 'tags']);

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'title', message: 'title is required.' }]);
  }

  if (typeof payload.org !== 'string' || payload.org.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'org', message: 'org is required.' }]);
  }

  if (typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'description is required.' }]);
  }

  const tags = Array.isArray(payload.tags) ? payload.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean) : [];

  return {
    title: payload.title.trim(),
    org: payload.org.trim(),
    link: typeof payload.link === 'string' ? payload.link.trim() : '',
    description: payload.description.trim(),
    tags,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:submit', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const payload = await parseJsonBody(request);
    const opportunity = validateOpportunityPayload(payload);

    const screening = screenTextContent([opportunity.title, opportunity.org, opportunity.description, ...opportunity.tags]);
    const moderationStatus = screening.decision === 'flagged' ? 'pending_review' : 'approved';

    const docRef = await admin.firestore().collection('opportunities').add({
      ...opportunity,
      ownerId: uid,
      status: 'pending',
      moderationStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await enqueueModerationItem({
      contentType: 'opportunity',
      contentId: docRef.id,
      submittedBy: uid,
      screening,
      preview: { title: opportunity.title, org: opportunity.org },
    });

    return NextResponse.json({
      id: docRef.id,
      moderationStatus,
      message: 'Opportunity submitted for review.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/opportunities/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

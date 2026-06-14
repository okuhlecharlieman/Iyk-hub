import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { enqueueModerationItem, screenTextContent } from '../../../../lib/api/moderation';
export const dynamic = 'force-dynamic';

const validateOpportunityPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'org', 'link', 'description', 'tags', 'expiresAt', 'mediaUrl']);

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'title', message: 'title is required.' }]);
  }

  if (typeof payload.org !== 'string' || payload.org.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'org', message: 'org is required.' }]);
  }

  if (typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'description is required.' }]);
  }

  let expiresAt = null;
  if (payload.expiresAt) {
    const parsedExpiresAt = new Date(payload.expiresAt);
    if (isNaN(parsedExpiresAt.getTime()) || parsedExpiresAt <= new Date()) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'expiresAt', message: 'Expiry date must be a valid future date.' }]);
    }
    expiresAt = parsedExpiresAt.toISOString();
  }

  const tags = Array.isArray(payload.tags) ? payload.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean) : [];

  return {
    title: payload.title.trim(),
    org: payload.org.trim(),
    link: typeof payload.link === 'string' ? payload.link.trim() : '',
    description: payload.description.trim(),
    tags,
    expiresAt,
    mediaUrl: typeof payload.mediaUrl === 'string' ? payload.mediaUrl.trim() : '',
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

    const docData = {
      ...opportunity,
      ownerId: uid,
      status: 'pending',
      moderationStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (opportunity.expiresAt) {
      docData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(opportunity.expiresAt));
    }

    const docRef = await admin.firestore().collection('opportunities').add(docData);

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
    return handleApiError(error, 'Error in /api/opportunities/submit');
  }
}

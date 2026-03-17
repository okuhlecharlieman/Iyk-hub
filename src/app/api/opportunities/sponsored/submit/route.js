import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { getSponsoredTierConfig } from '../../../../../lib/monetization/sponsored-opportunities';

const validateSponsoredPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'org', 'link', 'description', 'tags', 'billingEmail', 'tier']);

  const required = ['title', 'org', 'description', 'billingEmail', 'tier'];
  for (const field of required) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: field, message: `${field} is required.` }]);
    }
  }

  const tier = payload.tier.trim().toLowerCase();
  const tierConfig = getSponsoredTierConfig(tier);
  if (!tierConfig) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'tier', message: 'Invalid tier.' }]);
  }

  return {
    title: payload.title.trim(),
    org: payload.org.trim(),
    link: typeof payload.link === 'string' ? payload.link.trim() : '',
    description: payload.description.trim(),
    tags: Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean).slice(0, 20) : [],
    billingEmail: payload.billingEmail.trim().toLowerCase(),
    tier,
    tierConfig,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:sponsored:submit', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const payload = await parseJsonBody(request);
    const data = validateSponsoredPayload(payload);

    const db = admin.firestore();

    const opportunityRef = await db.collection('opportunities').add({
      title: data.title,
      org: data.org,
      link: data.link,
      description: data.description,
      tags: data.tags,
      ownerId: uid,
      status: 'pending',
      moderationStatus: 'pending_review',
      monetization: {
        type: 'sponsored',
        tier: data.tier,
        feeCents: data.tierConfig.feeCents,
        paymentStatus: 'pending_payment',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const orderRef = await db.collection('sponsoredOpportunityOrders').add({
      opportunityId: opportunityRef.id,
      ownerId: uid,
      org: data.org,
      billingEmail: data.billingEmail,
      tier: data.tier,
      feeCents: data.tierConfig.feeCents,
      paymentStatus: 'pending_payment',
      reviewStatus: 'pending_review',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      opportunityId: opportunityRef.id,
      orderId: orderRef.id,
      tier: data.tier,
      feeCents: data.tierConfig.feeCents,
      message: 'Sponsored opportunity submitted. Please complete payment to continue review.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/opportunities/sponsored/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

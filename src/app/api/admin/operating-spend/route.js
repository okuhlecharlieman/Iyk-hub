import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields, handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
import { appendLedgerEntry } from '../../../../lib/monetization/ledger';
import { LEDGER_ENTRY_TYPES } from '../../../../lib/monetization/constants';
export const dynamic = 'force-dynamic';

const SPEND_CATEGORIES = [
  'cloud_infrastructure',
  'marketing',
  'vendor_services',
  'payment_processing',
  'salaries',
  'legal',
  'other',
];

const validateSpendPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['amountCents', 'currency', 'category', 'vendor', 'description', 'invoiceRef', 'spendDate']);

  if (typeof payload.amountCents !== 'number' || payload.amountCents <= 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'amountCents', message: 'amountCents must be a positive number.' }]);
  }

  if (payload.category !== undefined && !SPEND_CATEGORIES.includes(payload.category)) {
    throw new RequestValidationError('Invalid request payload.', [
      { path: 'category', message: `category must be one of: ${SPEND_CATEGORIES.join(', ')}` },
    ]);
  }

  if (payload.vendor !== undefined && (typeof payload.vendor !== 'string' || payload.vendor.length > 200)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'vendor', message: 'vendor must be a string up to 200 chars.' }]);
  }

  if (payload.description !== undefined && (typeof payload.description !== 'string' || payload.description.length > 1000)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'description must be a string up to 1000 chars.' }]);
  }

  return {
    amountCents: Math.round(payload.amountCents),
    currency: payload.currency || 'ZAR',
    category: payload.category || 'other',
    vendor: payload.vendor?.trim() || null,
    description: payload.description?.trim() || '',
    invoiceRef: payload.invoiceRef?.trim() || null,
    spendDate: payload.spendDate || null,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'admin:operating-spend:create',
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticate(request);

    const payload = await parseJsonBody(request);
    const spend = validateSpendPayload(payload);

    const db = admin.firestore();

    const spendRef = await db.collection('operatingSpend').add({
      ...spend,
      recordedBy: actor.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await appendLedgerEntry(db, {
      entryType: LEDGER_ENTRY_TYPES.OPERATING_SPEND,
      amountCents: spend.amountCents,
      currency: spend.currency,
      description: `Operating spend: ${spend.category} — ${spend.vendor || 'N/A'} — ${spend.description}`,
      metadata: {
        category: spend.category,
        vendor: spend.vendor,
        invoiceRef: spend.invoiceRef,
        spendId: spendRef.id,
      },
    });

    await logAdminAction({
      request,
      actor,
      action: 'operating_spend.recorded',
      targetType: 'operating_spend',
      targetId: spendRef.id,
      metadata: { amountCents: spend.amountCents, category: spend.category, vendor: spend.vendor },
    });

    return NextResponse.json({
      success: true,
      spendId: spendRef.id,
      amountCents: spend.amountCents,
      category: spend.category,
    });
  } catch (error) {
    return handleApiError(error, 'Error recording operating spend');
  }
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'admin:operating-spend:list',
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    await authenticate(request);

    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const limitN = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const cursor = searchParams.get('cursor');
    const category = searchParams.get('category');

    let query = db.collection('operatingSpend').orderBy('createdAt', 'desc').limit(limitN);
    if (category && SPEND_CATEGORIES.includes(category)) {
      query = query.where('category', '==', category);
    }
    if (cursor) {
      const cursorSnap = await db.collection('operatingSpend').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snap = await query.get();
    const entries = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = snap.docs.length === limitN ? lastDoc?.id : null;

    const totalSnap = await db.collection('operatingSpend').count().get();
    const totalCount = totalSnap.data().count;

    return NextResponse.json({ success: true, entries, nextCursor, totalCount });
  } catch (error) {
    return handleApiError(error, 'Error listing operating spend');
  }
}

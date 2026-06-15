/**
 * API route handler for /api/admin/promos/codes.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticateWithRoles } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, handleApiError } from '../../../../../lib/api/validation';
import { logAdminAction } from '../../../../../lib/api/audit-log';
import { TEAM_MANAGEMENT_ROLES } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Generates a random promo code in the format PREFIX-XXXXXXXX.
 * Excludes easily confused characters (I, O, 0, 1).
 *
 * @param {string} prefix - Code prefix (default 'IYK').
 * @returns {string} e.g. 'IYK-4KRN7WBX'
 */
const generateCode = (prefix = 'IYK') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
};

/** Handles GET requests to /api/admin/promos/codes. */
export async function GET(request) {
  try {
    initializeFirebaseAdmin();
    await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const db = admin.firestore();

    const snapshot = await db.collection('promoCodes').orderBy('createdAt', 'desc').limit(100).get();
    const codes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        expiresAt: data.expiresAt?.toDate?.() ? data.expiresAt.toDate().toISOString() : data.expiresAt,
      };
    });

    return NextResponse.json({ codes });
  } catch (error) {
    return handleApiError(error, 'List promo codes error');
  }
}

/** Handles POST requests to /api/admin/promos/codes. */
export async function POST(request) {
  try {
    initializeFirebaseAdmin();
    const decoded = await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const body = await parseJsonBody(request);
    ensurePlainObject(body);

    const { points, maxRedemptions, expiresInDays, prefix, count } = body;

    if (typeof points !== 'number' || points <= 0 || points > 100000) {
      throw new RequestValidationError('Points must be between 1 and 100,000.');
    }
    if (maxRedemptions != null && (typeof maxRedemptions !== 'number' || maxRedemptions < 1)) {
      throw new RequestValidationError('maxRedemptions must be a positive number.');
    }
    if (expiresInDays != null && (typeof expiresInDays !== 'number' || expiresInDays < 1 || expiresInDays > 365)) {
      throw new RequestValidationError('expiresInDays must be between 1 and 365.');
    }

    const codeCount = Math.min(Math.max(count || 1, 1), 50);
    const codePrefix = typeof prefix === 'string' && prefix.trim() ? prefix.trim().toUpperCase().slice(0, 6) : 'IYK';
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const db = admin.firestore();
    const batch = db.batch();
    const createdCodes = [];

    for (let i = 0; i < codeCount; i++) {
      const code = generateCode(codePrefix);
      const ref = db.collection('promoCodes').doc(code);
      const docData = {
        code,
        points,
        maxRedemptions: maxRedemptions || null,
        redemptions: 0,
        redeemedBy: [],
        expiresAt: expiresAt || null,
        active: true,
        createdBy: decoded.uid,
        createdByEmail: decoded.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(ref, docData);
      createdCodes.push({ ...docData, id: code, createdAt: new Date().toISOString(), expiresAt: expiresAt?.toISOString() || null });
    }

    await batch.commit();

    await db.collection('promoHistory').add({
      type: 'codes_created',
      codes: createdCodes.map((c) => c.code),
      points,
      maxRedemptions: maxRedemptions || null,
      expiresAt: expiresAt || null,
      adminUid: decoded.uid,
      adminEmail: decoded.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminAction({
      actorUid: decoded.uid,
      actorEmail: decoded.email,
      action: 'create_promo_codes',
      details: { count: codeCount, points, prefix: codePrefix },
    });

    return NextResponse.json({ success: true, codes: createdCodes });
  } catch (error) {
    return handleApiError(error, 'Create promo codes error');
  }
}

/** Handles DELETE requests to /api/admin/promos/codes. */
export async function DELETE(request) {
  try {
    initializeFirebaseAdmin();
    const decoded = await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const body = await parseJsonBody(request);
    ensurePlainObject(body);

    const { codeId } = body;
    if (!codeId || typeof codeId !== 'string') {
      throw new RequestValidationError('codeId is required.');
    }

    const db = admin.firestore();
    const ref = db.collection('promoCodes').doc(codeId);
    const doc = await ref.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 });
    }

    await ref.update({ active: false });

    await logAdminAction({
      actorUid: decoded.uid,
      actorEmail: decoded.email,
      action: 'deactivate_promo_code',
      details: { codeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Delete promo code error');
  }
}

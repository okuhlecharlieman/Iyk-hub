/**
 * API route handler for /api/admin/promos/redeem.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, verifyIdTokenFromRequest } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, handleApiError } from '../../../../../lib/api/validation';

export const dynamic = 'force-dynamic';

/** Handles POST requests to /api/admin/promos/redeem. */
export async function POST(request) {
  try {
    initializeFirebaseAdmin();
    const decoded = await verifyIdTokenFromRequest(request);
    const body = await parseJsonBody(request);
    ensurePlainObject(body);

    const { code } = body;
    if (!code || typeof code !== 'string') {
      throw new RequestValidationError('Promo code is required.');
    }

    const db = admin.firestore();
    const codeRef = db.collection('promoCodes').doc(code.trim().toUpperCase());

    const result = await db.runTransaction(async (tx) => {
      const codeDoc = await tx.get(codeRef);

      if (!codeDoc.exists) {
        return { error: 'Invalid promo code.', status: 404 };
      }

      const codeData = codeDoc.data();

      if (!codeData.active) {
        return { error: 'This promo code has been deactivated.', status: 400 };
      }

      if (codeData.expiresAt) {
        const expiryDate = codeData.expiresAt.toDate ? codeData.expiresAt.toDate() : new Date(codeData.expiresAt);
        if (expiryDate < new Date()) {
          return { error: 'This promo code has expired.', status: 400 };
        }
      }

      if (codeData.maxRedemptions && codeData.redemptions >= codeData.maxRedemptions) {
        return { error: 'This promo code has reached its maximum redemptions.', status: 400 };
      }

      if (codeData.redeemedBy && codeData.redeemedBy.includes(decoded.uid)) {
        return { error: 'You have already redeemed this promo code.', status: 400 };
      }

      const userRef = db.collection('users').doc(decoded.uid);
      tx.update(userRef, {
        'points.lifetime': admin.firestore.FieldValue.increment(codeData.points),
        'points.weekly': admin.firestore.FieldValue.increment(codeData.points),
      });

      tx.update(codeRef, {
        redemptions: admin.firestore.FieldValue.increment(1),
        redeemedBy: admin.firestore.FieldValue.arrayUnion(decoded.uid),
      });

      return { success: true, points: codeData.points };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, points: result.points, message: `Successfully redeemed ${result.points} points!` });
  } catch (error) {
    return handleApiError(error, 'Redeem promo code error');
  }
}

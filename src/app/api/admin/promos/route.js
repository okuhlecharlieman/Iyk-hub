/**
 * API route handler for /api/admin/promos.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticateWithRoles } from '../../../../lib/firebase/admin';
import { handleApiError } from '../../../../lib/api/validation';
import { TEAM_MANAGEMENT_ROLES } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

/** Handles GET requests to /api/admin/promos. */
export async function GET(request) {
  try {
    initializeFirebaseAdmin();
    await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const db = admin.firestore();

    const historySnap = await db.collection('promoHistory').orderBy('createdAt', 'desc').limit(50).get();
    const history = historySnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    const codesSnap = await db.collection('promoCodes').orderBy('createdAt', 'desc').limit(100).get();
    const codes = codesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        expiresAt: data.expiresAt?.toDate?.() ? data.expiresAt.toDate().toISOString() : data.expiresAt,
      };
    });

    return NextResponse.json({ history, codes });
  } catch (error) {
    return handleApiError(error, 'Fetch promo data error');
  }
}

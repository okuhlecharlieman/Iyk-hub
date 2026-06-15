/**
 * API route handler for /api/admin/promos/allocate-points.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticateWithRoles } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, handleApiError } from '../../../../../lib/api/validation';
import { logAdminAction } from '../../../../../lib/api/audit-log';
import { TEAM_MANAGEMENT_ROLES } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

/** Handles POST requests to /api/admin/promos/allocate-points. */
export async function POST(request) {
  try {
    initializeFirebaseAdmin();
    const decoded = await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const body = await parseJsonBody(request);
    ensurePlainObject(body);

    const { points, target, filterField, filterValue } = body;

    if (typeof points !== 'number' || points <= 0 || points > 100000) {
      throw new RequestValidationError('Points must be a number between 1 and 100,000.');
    }
    if (!['all', 'role', 'email', 'custom'].includes(target)) {
      throw new RequestValidationError('target must be one of: all, role, email, custom.');
    }

    const db = admin.firestore();
    let usersQuery = db.collection('users');
    let description = '';

    if (target === 'all') {
      description = `Allocated ${points} points to all users`;
    } else if (target === 'role') {
      if (!filterValue) throw new RequestValidationError('filterValue is required when target is "role".');
      usersQuery = usersQuery.where('role', '==', filterValue);
      description = `Allocated ${points} points to users with role "${filterValue}"`;
    } else if (target === 'email') {
      if (!filterValue) throw new RequestValidationError('filterValue is required when target is "email".');
      description = `Allocated ${points} points to user "${filterValue}"`;
    } else if (target === 'custom') {
      if (!filterField || !filterValue) {
        throw new RequestValidationError('filterField and filterValue are required when target is "custom".');
      }
      usersQuery = usersQuery.where(filterField, '==', filterValue);
      description = `Allocated ${points} points to users where ${filterField} == "${filterValue}"`;
    }

    let updatedCount = 0;

    if (target === 'email') {
      const snapshot = await db.collection('users').where('email', '==', filterValue.trim().toLowerCase()).get();
      if (snapshot.empty) {
        return NextResponse.json({ error: `No user found with email "${filterValue}".` }, { status: 404 });
      }
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          'points.lifetime': admin.firestore.FieldValue.increment(points),
          'points.weekly': admin.firestore.FieldValue.increment(points),
        });
        updatedCount++;
      });
      await batch.commit();
    } else {
      const snapshot = await usersQuery.get();
      if (snapshot.empty) {
        return NextResponse.json({ error: 'No users matched the filter criteria.' }, { status: 404 });
      }

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach((doc) => {
          batch.update(doc.ref, {
            'points.lifetime': admin.firestore.FieldValue.increment(points),
            'points.weekly': admin.firestore.FieldValue.increment(points),
          });
          updatedCount++;
        });
        await batch.commit();
      }
    }

    await db.collection('promoHistory').add({
      type: 'points_allocation',
      points,
      target,
      filterField: filterField || null,
      filterValue: filterValue || null,
      usersAffected: updatedCount,
      adminUid: decoded.uid,
      adminEmail: decoded.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminAction({
      actorUid: decoded.uid,
      actorEmail: decoded.email,
      action: 'allocate_points',
      details: { points, target, filterValue, usersAffected: updatedCount },
    });

    return NextResponse.json({ success: true, usersAffected: updatedCount, description });
  } catch (error) {
    return handleApiError(error, 'Allocate points error');
  }
}

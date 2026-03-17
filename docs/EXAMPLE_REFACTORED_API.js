/**
 * Example: Refactored Opportunities API Endpoint
 * 
 * This example shows the recommended patterns for API endpoints using the new utilities.
 * Copy this structure to other endpoints.
 */

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin.js';
import { enforceRateLimit } from '../../../lib/api/rate-limit.js';
import { AuthMiddleware } from '../../../lib/api/auth-middleware.js';
import { BadRequestError, withErrorHandling, ForbiddenError } from '../../../lib/api/error-handler.js';
import { ValidationSchema, fieldTypes, commonFields } from '../../../lib/api/schema-validation.js';
import { logAdminAction, logSecurityEvent, logDataAccess } from '../../../lib/api/logging.js';

export const runtime = 'nodejs';

const MAX_LIMIT = 30;

// Schema for creating/updating opportunities
const opportunitySchema = new ValidationSchema({
  title: commonFields.displayName(),
  description: fieldTypes.string({ minLength: 10, maxLength: 2000 }),
  type: fieldTypes.enum(['gig', 'internship', 'scholarship', 'mentorship', 'other']),
  company: fieldTypes.string({ minLength: 1, maxLength: 200 }),
  url: commonFields.url(),
  deadline: fieldTypes.string({ nullable: true }),
  tags: fieldTypes.array(
    fieldTypes.string({ minLength: 1, maxLength: 50 }),
    { maxLength: 10 }
  ),
});

/**
 * GET /api/opportunities
 * List opportunities - public for approved, restricted for pending
 */
export const GET = withErrorHandling(async (request) => {
  // Rate limit public access
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'opportunities:get',
    limit: 90,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();

    // Get user info (optional for public endpoint)
    let user = null;
    try {
      user = await AuthMiddleware.authenticate(request);
    } catch {
      // Public access allowed
    }

    const uid = user?.uid;
    const isAdmin = user ? await checkIsAdmin(uid) : false;

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '12', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 12 : rawLimit, 1), MAX_LIMIT);
    const cursor = searchParams.get('cursor');

    const db = admin.firestore();

    // Admin sees all opportunities
    if (isAdmin) {
      return await getAdminOpportunities(db, limitN, cursor);
    }

    // Authenticated users see approved + their own pending
    if (user) {
      return await getUserOpportunities(db, uid, limitN, cursor);
    }

    // Anonymous users see only approved
    return await getPublicOpportunities(db, limitN, cursor);
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new Error('Failed to fetch opportunities');
  }
});

/**
 * POST /api/opportunities
 * Create new opportunity
 */
export const POST = withErrorHandling(async (request) => {
  // Authenticate
  const user = await AuthMiddleware.authenticate(request);

  // Validate input
  const body = await request.json();
  const validated = opportunitySchema.validate(body);

  await initializeFirebaseAdmin();
  const db = admin.firestore();

  // Create opportunity document
  const opportunityData = {
    ...validated,
    ownerId: user.uid,
    ownerEmail: user.email,
    status: 'pending', // Always pending until approved
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    views: 0,
    applied: 0,
  };

  const docRef = await db.collection('opportunities').add(opportunityData);

  // Log creation
  await logDataAccess({
    request,
    userId: user.uid,
    accessType: 'write',
    resourceType: 'opportunity',
    resourceId: docRef.id,
    isAuthorized: true,
  });

  return NextResponse.json(
    {
      id: docRef.id,
      message: 'Opportunity created. Awaiting admin approval.',
    },
    { status: 201 }
  );
});

/**
 * PUT /api/opportunities/[id]
 * Update opportunity (owner or admin only)
 */
export const PUT = withErrorHandling(async (request, { params }) => {
  // Enforce rate limiting on writes
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'opportunities:update',
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const user = await AuthMiddleware.authenticate(request);
  const body = await request.json();
  const validated = opportunitySchema.validate(body);

  await initializeFirebaseAdmin();
  const db = admin.firestore();

  const docRef = db.collection('opportunities').doc(params.id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new BadRequestError('Opportunity not found');
  }

  const opportunity = docSnap.data();
  const isOwner = opportunity.ownerId === user.uid;
  const isAdmin = await checkIsAdmin(user.uid);

  // Check authorization
  if (!isOwner && !isAdmin) {
    await logSecurityEvent({
      request,
      eventType: 'unauthorized_resource_update',
      userId: user.uid,
      severity: 'warning',
      description: `Attempted to update opportunity owned by ${opportunity.ownerId}`,
    });
    throw new ForbiddenError('You cannot update this opportunity');
  }

  // Non-admin can only update pending opportunities
  if (!isAdmin && opportunity.status !== 'pending') {
    throw new ForbiddenError('You can only edit pending opportunities');
  }

  // Update document
  await docRef.update({
    ...validated,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log update
  await logDataAccess({
    request,
    userId: user.uid,
    accessType: 'write',
    resourceType: 'opportunity',
    resourceId: params.id,
    isAuthorized: true,
  });

  return NextResponse.json({
    id: params.id,
    message: 'Opportunity updated successfully',
  });
});

/**
 * DELETE /api/opportunities/[id]
 * Delete opportunity (owner or admin only)
 */
export const DELETE = withErrorHandling(async (request, { params }) => {
  // Enforce rate limiting on deletes
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'opportunities:delete',
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const user = await AuthMiddleware.authenticate(request);

  await initializeFirebaseAdmin();
  const db = admin.firestore();

  const docRef = db.collection('opportunities').doc(params.id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new BadRequestError('Opportunity not found');
  }

  const opportunity = docSnap.data();
  const isOwner = opportunity.ownerId === user.uid;
  const isAdmin = await checkIsAdmin(user.uid);

  // Check authorization
  if (!isOwner && !isAdmin) {
    await logSecurityEvent({
      request,
      eventType: 'unauthorized_resource_delete',
      userId: user.uid,
      severity: 'warning',
      description: `Attempted to delete opportunity owned by ${opportunity.ownerId}`,
    });
    throw new ForbiddenError('You cannot delete this opportunity');
  }

  // Delete document
  await docRef.delete();

  // Log deletion
  if (isAdmin) {
    await logAdminAction({
      request,
      actor: user,
      action: 'opportunity.deleted',
      targetType: 'opportunity',
      targetId: params.id,
      metadata: { ownerId: opportunity.ownerId },
    });
  }

  return NextResponse.json({
    message: 'Opportunity deleted successfully',
  });
});

// ============ Helper Functions ============

async function getPublicOpportunities(db, limitN, cursor) {
  let queryRef = db
    .collection('opportunities')
    .where('status', '==', 'approved')
    .orderBy('createdAt', 'desc')
    .limit(limitN);

  if (cursor) {
    const cursorSnap = await db.collection('opportunities').doc(cursor).get();
    if (cursorSnap.exists) {
      queryRef = db
        .collection('opportunities')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .startAfter(cursorSnap)
        .limit(limitN);
    }
  }

  const snap = await queryRef.get();
  const opportunities = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextCursor = snap.docs.length === limitN ? lastDoc?.id : null;

  return NextResponse.json({ opportunities, nextCursor });
}

async function getUserOpportunities(db, uid, limitN, cursor) {
  // Fetch approved + user's pending
  const approved = [];
  const userPending = [];

  let queryRef = db
    .collection('opportunities')
    .where('status', 'in', ['approved', 'pending'])
    .orderBy('createdAt', 'desc')
    .limit(limitN * 2);

  if (cursor) {
    const cursorSnap = await db.collection('opportunities').doc(cursor).get();
    if (cursorSnap.exists) {
      queryRef = queryRef.startAfter(cursorSnap);
    }
  }

  const snap = await queryRef.get();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status === 'approved') {
      approved.push({ id: doc.id, ...data });
    } else if (data.ownerId === uid) {
      userPending.push({ id: doc.id, ...data });
    }
  }

  const opportunities = [...userPending, ...approved].slice(0, limitN);
  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextCursor = snap.docs.length > limitN ? lastDoc?.id : null;

  return NextResponse.json({ opportunities, nextCursor });
}

async function getAdminOpportunities(db, limitN, cursor) {
  let queryRef = db
    .collection('opportunities')
    .orderBy('createdAt', 'desc')
    .limit(limitN);

  if (cursor) {
    const cursorSnap = await db.collection('opportunities').doc(cursor).get();
    if (cursorSnap.exists) {
      queryRef = db
        .collection('opportunities')
        .orderBy('createdAt', 'desc')
        .startAfter(cursorSnap)
        .limit(limitN);
    }
  }

  const snap = await queryRef.get();
  const opportunities = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextCursor = snap.docs.length === limitN ? lastDoc?.id : null;

  return NextResponse.json({ opportunities, nextCursor });
}

async function checkIsAdmin(uid) {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
  } catch {
    return false;
  }
}

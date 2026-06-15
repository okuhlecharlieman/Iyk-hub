/**
 * Admin audit-logging utility.
 *
 * Records every privileged action (role changes, deletions, promo
 * allocations, etc.) to the `adminAuditLogs` Firestore collection
 * so admins can review a full history of who did what.
 */
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

/** Extracts IP and User-Agent from the request for the audit record. */
const getRequestMetadata = (request) => ({
  ip: request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || null,
  userAgent: request?.headers?.get('user-agent') || null,
});

/**
 * Writes an audit-log entry to Firestore.  Silently swallows
 * errors so a logging failure never crashes the calling route.
 *
 * @param {Object} opts
 * @param {Request} opts.request     - The original HTTP request (for IP/UA).
 * @param {Object}  opts.actor       - Decoded token of the admin performing the action.
 * @param {string}  opts.action      - Action key (e.g. 'promo.allocate', 'user.delete').
 * @param {string}  opts.targetType  - Entity type being acted on (e.g. 'user', 'promoCode').
 * @param {string}  [opts.targetId]  - ID of the target entity.
 * @param {string}  [opts.status]    - 'success' or 'failure'.
 * @param {Object}  [opts.metadata]  - Arbitrary extra data to store.
 * @param {string}  [opts.errorMessage] - Error message if status is 'failure'.
 */
export async function logAdminAction({
  request,
  actor,
  action,
  targetType,
  targetId = null,
  status = 'success',
  metadata = {},
  errorMessage = null,
}) {
  try {
    await initializeFirebaseAdmin();

    await admin.firestore().collection('adminAuditLogs').add({
      actorUid: actor?.uid || null,
      actorEmail: actor?.email || null,
      action,
      targetType,
      targetId,
      status,
      metadata,
      errorMessage,
      request: getRequestMetadata(request),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write admin audit log:', error?.message || error);
  }
}

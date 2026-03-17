import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

const getRequestMetadata = (request) => ({
  ip: request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || null,
  userAgent: request?.headers?.get('user-agent') || null,
});

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

import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin.js';

/**
 * Extract request metadata for logging
 */
function getRequestMetadata(request) {
  return {
    ip: request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request?.headers?.get('x-real-ip') 
      || 'unknown',
    userAgent: request?.headers?.get('user-agent') || 'unknown',
    method: request?.method || 'UNKNOWN',
    url: request?.url || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log admin actions to Firestore for audit trail
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

    const logEntry = {
      actorUid: actor?.uid || null,
      actorEmail: actor?.email || null,
      action,
      targetType,
      targetId,
      status,
      metadata: {
        ...metadata,
        request: getRequestMetadata(request),
      },
      errorMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin
      .firestore()
      .collection('adminAuditLogs')
      .add(logEntry);

    return logEntry;
  } catch (error) {
    console.error('Failed to write admin audit log:', error?.message || error);
    // Don't throw - logging failures shouldn't break the request
  }
}

/**
 * Log security-relevant events
 */
export async function logSecurityEvent({
  request,
  eventType,
  userId = null,
  severity = 'info', // 'info', 'warning', 'critical'
  description,
  details = {},
}) {
  try {
    await initializeFirebaseAdmin();

    const logEntry = {
      eventType,
      userId,
      severity,
      description,
      details: {
        ...details,
        request: getRequestMetadata(request),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin
      .firestore()
      .collection('securityLogs')
      .add(logEntry);

    // Log critical security events to console
    if (severity === 'critical') {
      console.error('[SECURITY] Critical event:', {
        eventType,
        userId,
        description,
        ...details,
      });
    }

    return logEntry;
  } catch (error) {
    console.error('Failed to write security log:', error?.message || error);
  }
}

/**
 * Log data access for compliance
 */
export async function logDataAccess({
  request,
  userId,
  accessType = 'read', // 'read', 'write', 'delete'
  resourceType,
  resourceId,
  isAuthorized = true,
  details = {},
}) {
  try {
    await initializeFirebaseAdmin();

    const logEntry = {
      userId,
      accessType,
      resourceType,
      resourceId,
      isAuthorized,
      details: {
        ...details,
        request: getRequestMetadata(request),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin
      .firestore()
      .collection('dataAccessLogs')
      .add(logEntry);

    // Log unauthorized access attempts
    if (!isAuthorized) {
      await logSecurityEvent({
        request,
        eventType: 'unauthorized_access_attempt',
        userId,
        severity: 'warning',
        description: `Unauthorized ${accessType} attempt on ${resourceType}:${resourceId}`,
        details: { resourceType, resourceId },
      });
    }

    return logEntry;
  } catch (error) {
    console.error('Failed to write data access log:', error?.message || error);
  }
}

/**
 * Structured console logging for development
 */
export function logApiRequest(request, details = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API]', {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

export function logApiResponse(statusCode, details = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[API_RESPONSE]', {
      statusCode,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

export function logApiError(error, request, details = {}) {
  console.error('[API_ERROR]', {
    error: error?.message,
    code: error?.code,
    statusCode: error?.statusCode,
    method: request?.method,
    url: request?.url,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

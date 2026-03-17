import { verifyIdTokenFromRequest, requireRole, initializeFirebaseAdmin } from '../firebase/admin.js';
import { UnauthorizedError, ForbiddenError } from './error-handler.js';
import { logSecurityEvent, logApiRequest } from './logging.js';

/**
 * Enhanced auth middleware for API routes
 */
export class AuthMiddleware {
  /**
   * Authenticate a request and return user info
   */
  static async authenticate(request) {
    try {
      const decodedToken = await verifyIdTokenFromRequest(request);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
      };
    } catch (error) {
      await logSecurityEvent({
        request,
        eventType: 'authentication_failed',
        severity: 'warning',
        description: error.message,
      });
      throw new UnauthorizedError(error.message);
    }
  }

  /**
   * Require admin role for the request
   */
  static async requireAdmin(request) {
    try {
      const decodedToken = await requireRole(request, ['admin']);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
        isAdmin: true,
      };
    } catch (error) {
      await logSecurityEvent({
        request,
        eventType: 'admin_access_denied',
        severity: 'warning',
        description: 'User attempted to access admin resource',
      });
      throw new ForbiddenError(error.message);
    }
  }

  /**
   * Require specific role
   */
  static async requireRole(request, roles) {
    try {
      await initializeFirebaseAdmin();
      const decodedToken = await verifyIdTokenFromRequest(request);

      const userRole = decodedToken.role || 'user';
      if (!roles.includes(userRole)) {
        throw new ForbiddenError(`Access requires one of: ${roles.join(', ')}`);
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
        role: userRole,
      };
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;

      await logSecurityEvent({
        request,
        eventType: 'role_check_failed',
        severity: 'warning',
        description: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user info without strict role check (just auth)
   */
  static async getUser(request) {
    const user = await this.authenticate(request);
    return user;
  }
}

/**
 * Helper to create protected route handlers
 */
export function createProtectedRoute(handler, { requireAdmin = false } = {}) {
  return async (request, context) => {
    try {
      logApiRequest(request);

      let user;
      if (requireAdmin) {
        user = await AuthMiddleware.requireAdmin(request);
      } else {
        user = await AuthMiddleware.authenticate(request);
      }

      return await handler(request, { ...context, user });
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Check authorization for specific resource
 */
export async function checkResourceAuthorization(
  request,
  resourceOwnerId,
  userInfo
) {
  const owner = userInfo.uid === resourceOwnerId;
  const isAdmin = await checkIfAdmin(userInfo.uid);

  if (!owner && !isAdmin) {
    await logSecurityEvent({
      request,
      eventType: 'unauthorized_resource_access',
      userId: userInfo.uid,
      severity: 'warning',
      description: `User attempted to access resource owned by ${resourceOwnerId}`,
      details: { owner, isAdmin, resourceOwnerId },
    });

    throw new ForbiddenError('You do not have access to this resource');
  }

  return { isOwner: owner, isAdmin };
}

/**
 * Check if user is admin (cached)
 */
const adminCache = new Map();
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function checkIfAdmin(uid) {
  const now = Date.now();
  const cached = adminCache.get(uid);

  if (cached && cached.timestamp > now - ADMIN_CACHE_TTL) {
    return cached.isAdmin;
  }

  try {
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .get();

    const isAdmin = userDoc.exists && userDoc.data()?.role === 'admin';
    adminCache.set(uid, { isAdmin, timestamp: now });

    return isAdmin;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
}

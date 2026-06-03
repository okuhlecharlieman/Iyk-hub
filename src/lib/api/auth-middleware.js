import { verifyIdTokenFromRequest, requireRole, initializeFirebaseAdmin } from '../firebase/admin.js';
import { UnauthorizedError, ForbiddenError } from './error-handler.js';
import { logSecurityEvent } from './logging.js';

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



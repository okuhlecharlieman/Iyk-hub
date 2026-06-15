/**
 * Standardized API error classes.
 *
 * Throw these from any API route handler to automatically return
 * a JSON error response with the correct HTTP status code.
 * Used by `handleApiError()` to format the response.
 */

/** Base API error — extends native Error with an HTTP statusCode and optional details. */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** 401 Unauthorized — caller is not authenticated. */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Not authenticated') {
    super(message, 401, null);
  }
}

/** 403 Forbidden — caller lacks the required permissions. */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, null);
  }
}



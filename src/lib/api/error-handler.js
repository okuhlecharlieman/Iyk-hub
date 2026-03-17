import { NextResponse } from 'next/server';

/**
 * Standardized error types for the API
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Not authenticated') {
    super(message, 401, null);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, null);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, null);
  }
}

export class ConflictError extends ApiError {
  constructor(message, details = null) {
    super(message, 409, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, { retryAfter });
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', originalError = null) {
    super(message, 500, null);
    this.originalError = originalError;
  }
}

/**
 * Handle API errors with consistent response format
 */
export function handleApiError(error, logContext = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log error details
  const logEntry = {
    timestamp: new Date().toISOString(),
    errorName: error.name,
    message: error.message,
    statusCode: error.statusCode || 500,
    ...logContext,
  };

  if (!isProduction) {
    logEntry.stack = error.stack;
  }

  // Don't log 4xx errors as errors, just as warnings
  if (error.statusCode && error.statusCode < 500) {
    console.warn('API Warning:', logEntry);
  } else {
    console.error('API Error:', logEntry);
  }

  const statusCode = error.statusCode || 500;
  const responseBody = {
    error: error.message,
    statusCode,
  };

  if (error.details) {
    responseBody.details = error.details;
  }

  // Don't expose internal details in production
  if (!isProduction && error.originalError) {
    responseBody.originalError = error.originalError.message;
  }

  return NextResponse.json(responseBody, { status: statusCode });
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return handleApiError(error);
      }

      // Handle Firebase-specific errors
      if (error?.code === 'auth/user-not-found') {
        return handleApiError(new NotFoundError('User not found'));
      }
      if (error?.code === 'auth/invalid-uid') {
        return handleApiError(new BadRequestError('Invalid user ID'));
      }

      // Generic server error
      return handleApiError(
        new InternalServerError('An unexpected error occurred', error)
      );
    }
  };
}

export { ApiError };

/**
 * Shared request-validation and error-handling utilities for API routes.
 *
 * Provides helpers to parse JSON bodies, validate payloads, and
 * convert thrown errors into standardised JSON responses.
 */
import { NextResponse } from 'next/server';

/** Thrown when the request payload fails validation (HTTP 400). */
export class RequestValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'RequestValidationError';
    this.code = 400;
    this.details = details;
  }
}

/**
 * Parses the JSON body from a Request, throwing a 400 if it's invalid.
 * @param {Request} request
 * @returns {Promise<Object>}
 */
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new RequestValidationError('Request body must be valid JSON.');
  }
}

/**
 * Asserts that `value` is a non-null, non-array object.
 * @param {*}      value   - The value to check.
 * @param {string} message - Error message if validation fails.
 */
export function ensurePlainObject(value, message = 'Payload must be a JSON object.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(message);
  }
}

/**
 * Throws a 400 if the payload contains keys not in allowedFields.
 * @param {Object}   payload       - The parsed request body.
 * @param {string[]} allowedFields - Whitelist of permitted field names.
 */
export function validateNoExtraFields(payload, allowedFields) {
  const unknownFields = Object.keys(payload).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new RequestValidationError('Invalid request payload.', unknownFields.map((field) => ({ path: field, message: 'Unexpected field.' })));
  }
}

/**
 * Converts an error into a standardised NextResponse JSON error.
 * Recognises auth errors (401/403), validation errors (400),
 * and logs everything else as a 500.
 *
 * @param {Error}  error          - The caught error.
 * @param {string} contextMessage - Logged alongside 500 errors for debugging.
 * @returns {NextResponse}
 */
export function handleApiError(error, contextMessage = 'Internal server error') {
  if (error?.code === 401 || error?.code === 403) {
    return NextResponse.json({ error: error.message }, { status: error.code });
  }
  if (error instanceof RequestValidationError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
  }
  console.error(contextMessage + ':', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

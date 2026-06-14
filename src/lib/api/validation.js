import { NextResponse } from 'next/server';

export class RequestValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'RequestValidationError';
    this.code = 400;
    this.details = details;
  }
}

export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new RequestValidationError('Request body must be valid JSON.');
  }
}

export function ensurePlainObject(value, message = 'Payload must be a JSON object.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(message);
  }
}

export function validateNoExtraFields(payload, allowedFields) {
  const unknownFields = Object.keys(payload).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new RequestValidationError('Invalid request payload.', unknownFields.map((field) => ({ path: field, message: 'Unexpected field.' })));
  }
}

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

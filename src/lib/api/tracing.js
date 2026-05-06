/**
 * Lightweight request tracing for observability.
 *
 * Generates a trace ID per request, measures latency, and emits
 * structured JSON logs that any log aggregator (Sentry, Datadog,
 * Google Cloud Logging, Vercel Log Drains) can parse.
 *
 * Usage in a route handler:
 *
 *   import { startTrace, endTrace, traceError } from '@/lib/api/tracing';
 *
 *   export async function POST(request) {
 *     const trace = startTrace(request, 'payments:create-intent');
 *     try {
 *       // ... handler logic ...
 *       return endTrace(trace, 200, response);
 *     } catch (error) {
 *       traceError(trace, error);
 *       return NextResponse.json({ error: 'Internal error' }, { status: 500 });
 *     }
 *   }
 */

const generateTraceId = () =>
  `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function startTrace(request, operationName) {
  const traceId = request?.headers?.get('x-trace-id') || generateTraceId();
  const trace = {
    traceId,
    operationName,
    startTime: Date.now(),
    method: request?.method || 'UNKNOWN',
    url: request?.url || 'unknown',
    userAgent: request?.headers?.get('user-agent') || 'unknown',
    ip: request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request?.headers?.get('x-real-ip')
      || 'unknown',
  };

  return trace;
}

export function endTrace(trace, statusCode, response = null) {
  const durationMs = Date.now() - trace.startTime;

  const logEntry = {
    level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
    msg: `${trace.method} ${trace.operationName}`,
    traceId: trace.traceId,
    operationName: trace.operationName,
    durationMs,
    statusCode,
    method: trace.method,
    url: trace.url,
    timestamp: new Date().toISOString(),
  };

  // Emit structured log
  if (logEntry.level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (logEntry.level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }

  // Add trace headers to response if provided
  if (response?.headers) {
    response.headers.set('X-Trace-Id', trace.traceId);
    response.headers.set('X-Response-Time', `${durationMs}ms`);
  }

  return response;
}

export function traceError(trace, error) {
  const durationMs = Date.now() - trace.startTime;

  const logEntry = {
    level: 'error',
    msg: `${trace.method} ${trace.operationName} FAILED`,
    traceId: trace.traceId,
    operationName: trace.operationName,
    durationMs,
    error: error?.message || String(error),
    errorCode: error?.code || null,
    stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
    method: trace.method,
    url: trace.url,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(logEntry));
}

/**
 * Middleware-level tracing for all requests.
 * Call from middleware.js to add trace headers automatically.
 */
export function addTraceHeaders(request, response) {
  const traceId = request?.headers?.get('x-trace-id') || generateTraceId();
  response.headers.set('X-Trace-Id', traceId);
  return traceId;
}

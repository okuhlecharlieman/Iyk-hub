import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    firebase: 'unknown',
    firestore: 'unknown',
    memory: {},
  };

  try {
    await initializeFirebaseAdmin();
    checks.firebase = 'connected';
  } catch {
    checks.firebase = 'error';
    checks.status = 'degraded';
  }

  try {
    if (admin.apps.length > 0) {
      const db = admin.firestore();
      const start = Date.now();
      await db.collection('_healthcheck').doc('ping').set({
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
      checks.firestore = 'connected';
      checks.firestoreLatencyMs = Date.now() - start;
    }
  } catch {
    checks.firestore = 'error';
    checks.status = 'degraded';
  }

  const mem = process.memoryUsage();
  checks.memory = {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
  };

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: httpStatus });
}

import { NextResponse } from 'next/server';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

const MAX_LIMIT = 500;

export async function GET(request) {
  try {
    await initializeFirebaseAdmin();
    await authenticate(request);

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '200', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 200 : rawLimit, 1), MAX_LIMIT);
    const cursor = searchParams.get('cursor');

    const db = (await import('firebase-admin')).firestore();

    let query = db.collection('adminAuditLogs').orderBy('createdAt', 'desc').limit(limitN);

    if (cursor) {
      const cursorDoc = await db.collection('adminAuditLogs').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = snapshot.docs.length === limitN ? lastDoc.id : null;

    return NextResponse.json({ success: true, entries, nextCursor });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.code });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}

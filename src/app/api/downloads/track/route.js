import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    const downloadsRef = db.collection('appStats').doc('downloads');
    await downloadsRef.set(
      {
        count: admin.firestore.FieldValue.increment(1),
        lastDownloadAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPlatform: body.platform || 'unknown',
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

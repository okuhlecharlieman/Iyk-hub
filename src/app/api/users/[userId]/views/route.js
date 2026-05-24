
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';

export async function POST(request, { params }) {
  try {
    await initializeFirebaseAdmin();
    const { userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const today = new Date().toISOString().split('T')[0]; // Get date in YYYY-MM-DD format

    // Use a transaction to ensure atomic updates
    // All reads must come before all writes in a Firestore transaction.
    const dailyViewsRef = userRef.collection('dailyViews').doc(today);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const dailyViewsDoc = await transaction.get(dailyViewsRef);

      if (!userDoc.exists) {
        return;
      }

      transaction.update(userRef, { 
        profileViewCount: admin.firestore.FieldValue.increment(1)
      });

      if (dailyViewsDoc.exists) {
        transaction.update(dailyViewsRef, { count: admin.firestore.FieldValue.increment(1) });
      } else {
        transaction.set(dailyViewsRef, { count: 1 });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error incrementing profile view count:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

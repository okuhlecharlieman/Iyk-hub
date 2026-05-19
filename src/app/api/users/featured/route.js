
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';

export async function GET() {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const usersRef = db.collection('users');
    // This query is not optimal and will be slow on large datasets
    // A better approach would be to have a separate collection for featured users
    const snapshot = await usersRef.where('activeBoost.tier', '==', 'ULTRA').get();

    if (snapshot.empty) {
      return NextResponse.json({ featuredUsers: [] });
    }

    const featuredUsers = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        featuredUsers.push({ 
            uid: doc.id,
            displayName: data.displayName,
            photoURL: data.photoURL,
            bio: data.bio
        });
    });

    return NextResponse.json({ featuredUsers });

  } catch (error) {
    console.error('Error fetching featured users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

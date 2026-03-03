import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

// This function fetches showcase posts and enriches them with author data.
// It uses the Firebase Admin SDK to bypass security rules, making the data
// available publicly and avoiding client-side permission issues.
export async function GET(request) {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    // IMPORTANT: This query requires a composite index in Firestore.
    // If you see a "FAILED_PRECONDITION" error in your logs, please create the index.
    // The error message from Firebase will include a direct link to create it.
    // Index details:
    // Collection: wallPosts
    // Fields: isApproved (Ascending), createdAt (Descending)
    const postsSnapshot = await db.collection('wallPosts')
                                  .where('isApproved', '==', true)
                                  .orderBy('createdAt', 'desc')
                                  .limit(50)
                                  .get();
                                  
    if (postsSnapshot.empty) {
      return NextResponse.json([]);
    }

    const posts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to a serializable ISO string
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });

    // 2. Extract unique author UIDs
    const authorUids = [...new Set(posts.map(p => p.uid).filter(uid => uid))];

    if (authorUids.length === 0) {
        // If no posts have authors, return them as is
        return NextResponse.json(posts.map(p => ({...p, author: { displayName: 'Anonymous User', photoURL: null }})));
    }
    
    // 3. Fetch author documents from the 'users' collection
    const authorDocs = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', authorUids).get();
    
    const authors = {};
    authorDocs.forEach(doc => {
        const { displayName, photoURL } = doc.data();
        authors[doc.id] = { displayName: displayName || 'Anonymous User', photoURL };
    });

    // 4. Combine posts with their author's data
    const postsWithAuthors = posts.map(post => ({
      ...post,
      author: authors[post.uid] || { displayName: 'Anonymous User', photoURL: null },
    }));

    return NextResponse.json(postsWithAuthors);

  } catch (error) {
    console.error('Error in /api/showcase GET handler:', error);
    // Provide a structured error response
    return NextResponse.json({ 
        error: 'Internal Server Error', 
        message: 'Unable to fetch showcase posts.',
        details: error.message 
    }, { status: 500 });
  }
}

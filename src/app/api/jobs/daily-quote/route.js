import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';

const NINJAS_API_KEY = process.env.NINJAS_API_KEY;
const NINJAS_API_URL = 'https://api.api-ninjas.com/v1/quotes?category=inspirational';

export async function GET(request) {
  console.log('[Cron: Daily Quote] Job triggered at:', new Date().toISOString());

  // 1. Verify Authorization with strict logging
  const isAuth = isAuthorizedCron(request);
  console.log('[Cron: Daily Quote] Authorization status:', isAuth);

  if (!isAuth) {
    const hasAuthHeader = !!request.headers.get('authorization');
    console.warn(`[Cron: Daily Quote] Unauthorized access blocked. Auth header present: ${hasAuthHeader}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron: Daily Quote] Initializing Firebase Admin instance...');
    await initializeFirebaseAdmin();
    const db = admin.firestore();
    console.log('[Cron: Daily Quote] Firebase Admin initialized successfully.');

    let quoteText = 'Your journey to greatness starts now.';
    let quoteAuthor = 'Intwana Hub';

    console.log('[Cron: Daily Quote] Checking NINJAS_API_KEY presence:', NINJAS_API_KEY ? 'FOUND' : 'MISSING');
    
    if (NINJAS_API_KEY) {
      try {
        console.log('[Cron: Daily Quote] Dispatching fetch request to API Ninjas...');
        const res = await fetch(NINJAS_API_URL, {
          headers: { 'X-Api-Key': NINJAS_API_KEY },
        });

        console.log('[Cron: Daily Quote] API Ninjas network response code:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Cron: Daily Quote] Received data payload:', JSON.stringify(data));
          
          if (Array.isArray(data) && data.length > 0) {
            quoteText = data[0].quote || quoteText;
            quoteAuthor = data[0].author || quoteAuthor;
          }
        } else {
          const errorResponse = await res.text();
          console.error('[Cron: Daily Quote] API Ninjas returned error response status:', res.status, 'Body:', errorResponse);
        }
      } catch (apiErr) {
        console.error('[Cron: Daily Quote] Network or parse failure during API Ninjas fetch:', apiErr.message);
      }
    }

    console.log('[Cron: Daily Quote] Transmitting new document to Firestore "quotes" collection...');
    const docRef = await db.collection('quotes').add({
      text: quoteText,
      author: quoteAuthor,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[Cron: Daily Quote] Firestore write successful. Generated Doc ID: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      quote: { text: quoteText, author: quoteAuthor },
    });
  } catch (error) {
    console.error('[Cron: Daily Quote] CRITICAL ERROR during execution loop:', error);
    return NextResponse.json(
      { error: 'Failed to fetch/store quote', details: error?.message }, 
      { status: 500 }
    );
  }
}

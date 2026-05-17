import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';

const NINJAS_API_KEY = process.env.NINJAS_API_KEY;
const NINJAS_API_URL = 'https://api.api-ninjas.com/v1/quotes?category=inspirational';

export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    let quoteText = 'Your journey to greatness starts now.';
    let quoteAuthor = 'Intwana Hub';

    if (NINJAS_API_KEY) {
      try {
        const res = await fetch(NINJAS_API_URL, {
          headers: { 'X-Api-Key': NINJAS_API_KEY },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            quoteText = data[0].quote || quoteText;
            quoteAuthor = data[0].author || quoteAuthor;
          }
        }
      } catch (apiErr) {
        console.error('Failed to fetch quote from API Ninjas:', apiErr.message);
      }
    }

    await db.collection('quotes').add({
      text: quoteText,
      author: quoteAuthor,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      quote: { text: quoteText, author: quoteAuthor },
    });
  } catch (error) {
    console.error('Daily quote job error:', error);
    return NextResponse.json({ error: 'Failed to fetch/store quote' }, { status: 500 });
  }
}

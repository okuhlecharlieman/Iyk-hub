import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import crypto from 'crypto';

export async function POST(request) {
  try {
    await initializeFirebaseAdmin();

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'PayStack not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const data = event.data;
      const { reference, metadata } = data;
      const db = admin.firestore();

      const paymentsSnap = await db.collection('payments')
        .where('paystackReference', '==', reference)
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        await paymentsSnap.docs[0].ref.update({
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (metadata?.orderType && metadata?.orderId) {
        const collectionMap = {
          creatorBoost: 'creatorBoosts',
          sponsoredChallenge: 'sponsoredChallenges',
          donation: 'donations',
        };
        const col = collectionMap[metadata.orderType];
        if (col) {
          await db.collection(col).doc(metadata.orderId).set({
            paymentStatus: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayStack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

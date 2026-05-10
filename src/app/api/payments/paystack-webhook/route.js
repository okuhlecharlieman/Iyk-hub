import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import crypto from 'crypto';
import { appendLedgerEntry, LEDGER_ENTRY_TYPES } from '../../../../lib/monetization/ledger';

const extractMetadataField = (metadata, field) => {
  if (!metadata) return undefined;
  if (metadata[field] !== undefined) return metadata[field];
  if (Array.isArray(metadata.custom_fields)) {
    const found = metadata.custom_fields.find(
      (item) => item.variable_name === field || item.display_name === field
    );
    return found?.value;
  }
  return undefined;
};

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
      let orderType = extractMetadataField(metadata, 'orderType') || extractMetadataField(metadata, 'order_type') || 'donation';
      let orderId = extractMetadataField(metadata, 'orderId') || extractMetadataField(metadata, 'order_id') || null;
      if (typeof orderType === 'string') {
        orderType = orderType.trim();
        if (orderType.toLowerCase() === 'donation') orderType = 'donation';
      }
      if (typeof orderId === 'string') {
        orderId = orderId.trim() || null;
      }

      await db.collection('paymentLogs').add({
        paystackReference: reference,
        orderType,
        orderId,
        amountCents: data.amount,
        currency: data.currency,
        status: 'succeeded',
        customerEmail: data.customer?.email || null,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await appendLedgerEntry(db, {
        entryType: LEDGER_ENTRY_TYPES.CHARGE_SUCCEEDED,
        orderType,
        orderId,
        amountCents: data.amount,
        currency: data.currency?.toUpperCase() || 'ZAR',
        description: `Paystack charge succeeded for ${orderType} ${orderId || reference}`,
      });

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

      if (orderType && orderId) {
        const collectionMap = {
          creatorBoost: 'creatorBoosts',
          sponsoredChallenge: 'sponsoredChallenges',
          donation: 'donations',
        };
        const col = collectionMap[orderType];
        if (col) {
          await db.collection(col).doc(orderId).set({
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

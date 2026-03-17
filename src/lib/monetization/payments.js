import admin from 'firebase-admin';

const SUPPORTED_ORDER_COLLECTIONS = {
  sponsoredOpportunity: {
    collection: 'sponsoredOpportunityOrders',
    statusField: 'paymentStatus',
  },
  institution: {
    collection: 'institutionAccounts',
    statusField: 'paymentStatus',
  },
  creatorBoost: {
    collection: 'creatorBoostOrders',
    statusField: 'paymentStatus',
  },
  placementFee: {
    collection: 'placementReports',
    statusField: 'feeStatus',
  },
};

export const getOrderConfig = (orderType) => SUPPORTED_ORDER_COLLECTIONS[orderType] || null;

export async function createPaymentIntentRecord({
  db,
  uid,
  orderType,
  orderId,
  amountCents,
  currency = 'ZAR',
  metadata = {},
}) {
  const paymentRef = await db.collection('payments').add({
    ownerUid: uid,
    orderType,
    orderId,
    amountCents,
    currency,
    status: 'pending',
    provider: 'mock',
    providerPaymentId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    metadata,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return paymentRef;
}

export async function applyPaymentStatusToOrder({ db, orderType, orderId, status }) {
  const config = getOrderConfig(orderType);
  if (!config) {
    throw new Error(`Unsupported orderType: ${orderType}`);
  }

  const normalized = status === 'paid' ? 'paid' : status === 'failed' ? 'failed' : 'pending_payment';
  await db.collection(config.collection).doc(orderId).set({
    [config.statusField]: normalized,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return normalized;
}

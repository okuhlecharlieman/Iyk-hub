import admin from 'firebase-admin';
import { getCreatorBoostPlan } from '../monetization/creator-boosts';

export async function queryActiveBoost(uid) {
  const now = new Date();
  let snap;
  try {
    snap = await admin
      .firestore()
      .collection('creatorBoostOrders')
      .where('ownerUid', '==', uid)
      .where('activationStatus', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
  } catch {
    snap = await admin
      .firestore()
      .collection('creatorBoostOrders')
      .where('ownerUid', '==', uid)
      .where('activationStatus', '==', 'active')
      .limit(5)
      .get();
  }

  if (snap.empty) return null;

  const sortedDocs = [...snap.docs].sort((a, b) => {
    const aTime = a.data().createdAt?.toDate?.() || new Date(0);
    const bTime = b.data().createdAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });
  const doc = sortedDocs[0];
  const data = doc.data();

  const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt ? new Date(data.expiresAt) : null;
  if (expiresAt && expiresAt <= now) return null;

  const plan = getCreatorBoostPlan(data.plan);

  return {
    id: doc.id,
    plan: data.plan,
    tier: data.plan?.toUpperCase() || null,
    label: plan?.label || data.plan,
    visibilityMultiplier: plan?.visibilityMultiplier || data.visibilityMultiplier || 1,
    videoChatSeconds: plan?.videoChatSeconds || 60,
    badge: plan?.badge || null,
    badgeColor: plan?.badgeColor || null,
    badgeLabel: plan?.badgeLabel || null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };
}

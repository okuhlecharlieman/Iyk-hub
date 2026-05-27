import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';

export async function GET(request) {
  const auth = await AuthMiddleware.requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const [usersSnap, oppsSnap, boostsSnap, challengesSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('opportunities').get(),
      db.collection('creatorBoostOrders').count().get(),
      db.collection('sponsoredChallenges').count().get(),
    ]);

    let pending = 0;
    let approved = 0;
    oppsSnap.forEach((doc) => {
      const status = doc.data().status;
      if (status === 'pending') pending++;
      if (status === 'approved') approved++;
    });

    return NextResponse.json({
      users: usersSnap.data().count,
      pending,
      approved,
      boostOrders: boostsSnap.data().count,
      challengeOrders: challengesSnap.data().count,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

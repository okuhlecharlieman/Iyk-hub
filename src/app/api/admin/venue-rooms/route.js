/**
 * Admin API for monitoring and moderating live quiz rooms.
 *
 * GET    /api/admin/venue-rooms            list recent rooms
 * PATCH  /api/admin/venue-rooms            update a room status
 * DELETE /api/admin/venue-rooms?id=1234   remove a room
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, requireRole } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin(request) {
  await initializeFirebaseAdmin();
  await requireRole(request, ['admin']);
}

export async function GET(request) {
  try {
    await requireAdmin(request);
    const snapshot = await admin.firestore()
      .collection('venueRooms')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const rooms = snapshot.docs.map((room) => {
      const data = room.data();
      const playerCount = Object.keys(data.players || {}).filter((uid) => uid !== data.hostUid).length;
      return {
        id: room.id,
        hostUid: data.hostUid,
        hostName: data.hostName || 'Unknown host',
        status: data.status || 'unknown',
        playerCount,
        questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
        currentQuestionIndex: data.currentQuestionIndex || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      };
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    const status = error?.code === 403 || error?.code === 401 ? error.code : 500;
    console.error('Admin venue rooms GET error:', error);
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : error.message }, { status });
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { id, status } = await request.json();
    const allowedStatuses = ['lobby', 'live', 'reveal', 'finished', 'closed'];
    if (!id || !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 });
    }

    await admin.firestore().collection('venueRooms').doc(id).update({ status });
    return NextResponse.json({ updated: true });
  } catch (error) {
    const status = error?.code === 403 || error?.code === 401 ? error.code : 500;
    console.error('Admin venue rooms PATCH error:', error);
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : error.message }, { status });
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await admin.firestore().collection('venueRooms').doc(id).delete();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const status = error?.code === 403 || error?.code === 401 ? error.code : 500;
    console.error('Admin venue rooms DELETE error:', error);
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : error.message }, { status });
  }
}

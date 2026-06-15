/**
 * Admin Game Content API — CRUD for quiz questions and hangman words.
 *
 * GET  /api/admin/game-content?type=quiz|hangman  — list all items
 * POST /api/admin/game-content                    — add single or batch items
 * DELETE /api/admin/game-content?id=...&type=...  — delete a single item
 *
 * Requires admin authentication.
 * Firestore collection: gameContent/{type}/items
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

/** require Admin. */
async function requireAdmin(request) {
  await initializeFirebaseAdmin();
  const uid = await authenticateAndGetUid(request);
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw { code: 403, message: 'Admin access required' };
  }
  return uid;
}

/** Handles GET requests to /api/admin/game-content. */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['quiz', 'hangman'].includes(type)) {
      return NextResponse.json({ error: 'type must be "quiz" or "hangman"' }, { status: 400 });
    }

    const snap = await db.collection('gameContent').doc(type).collection('items').orderBy('createdAt', 'desc').get();
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    if (err?.code === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error('Admin game content GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Handles POST requests to /api/admin/game-content. */
export async function POST(request) {
  try {
    const uid = await requireAdmin(request);
    const db = admin.firestore();
    const body = await request.json();
    const { type, items, item } = body;

    if (!type || !['quiz', 'hangman'].includes(type)) {
      return NextResponse.json({ error: 'type must be "quiz" or "hangman"' }, { status: 400 });
    }

    const batch = db.batch();
    const collRef = db.collection('gameContent').doc(type).collection('items');
    let addedCount = 0;

    // Single item add
    if (item) {
      const docRef = collRef.doc();
      batch.set(docRef, {
        ...item,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: uid,
      });
      addedCount = 1;
    }

    // Batch JSON import
    if (Array.isArray(items) && items.length > 0) {
      const maxBatch = 500;
      const toAdd = items.slice(0, maxBatch);
      for (const entry of toAdd) {
        const docRef = collRef.doc();
        batch.set(docRef, {
          ...entry,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          addedBy: uid,
        });
      }
      addedCount = toAdd.length;
    }

    if (addedCount === 0) {
      return NextResponse.json({ error: 'No items provided. Send "item" or "items" array.' }, { status: 400 });
    }

    await batch.commit();
    return NextResponse.json({ added: addedCount, message: `Successfully added ${addedCount} ${type} item(s).` });
  } catch (err) {
    if (err?.code === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error('Admin game content POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Handles DELETE requests to /api/admin/game-content. */
export async function DELETE(request) {
  try {
    await requireAdmin(request);
    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !['quiz', 'hangman'].includes(type)) {
      return NextResponse.json({ error: 'type must be "quiz" or "hangman"' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.collection('gameContent').doc(type).collection('items').doc(id).delete();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err?.code === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error('Admin game content DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

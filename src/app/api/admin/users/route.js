import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, listAllUsers } from '../../../../lib/firebase/admin';

// GET handler to retrieve all users.
export async function GET(req) {
  try {
    await authenticate(req);
    const users = await listAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await authenticate(req);

    const { uid, ...updateData } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const authUpdateData = {};
    const allowedAuthFields = ['displayName', 'email', 'photoURL', 'password', 'phoneNumber', 'disabled', 'emailVerified'];
    allowedAuthFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        authUpdateData[field] = updateData[field];
      }
    });

    let authExists = true;
    try {
      await admin.auth().getUser(uid);
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        authExists = false;
      } else {
        throw error;
      }
    }

    if (authExists && Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(uid, authUpdateData);
    }

    const adminDb = admin.firestore();
    await adminDb.collection('users').doc(uid).set(updateData, { merge: true });

    if (Object.prototype.hasOwnProperty.call(updateData, 'role')) {
      if (!authExists) {
        return NextResponse.json({ error: `User ${uid} has no Firebase Auth account; cannot set role claims.` }, { status: 400 });
      }
      await admin.auth().setCustomUserClaims(uid, { role: updateData.role });
    }

    return NextResponse.json({ message: `User ${uid} updated successfully`, authExists });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await authenticate(req);

    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const adminDb = admin.firestore();
    await adminDb.collection('users').doc(uid).delete();
    await adminDb.collection('leaderboard').doc(uid).delete();

    return NextResponse.json({ message: `User ${uid} deleted successfully` });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

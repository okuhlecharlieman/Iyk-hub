import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate } from '../../../../lib/firebase/admin';
import { listAllUsers } from '../../../../lib/firebase/admin';
import { validateAdminDeletePayload, validateAdminUpdatePayload } from '../../../../lib/server/validation';

async function verifyAdmin(req) {
  try {
    await authenticate(req);
    return { success: true };
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return { error: error.message, status: error.code };
    }
    console.error('Error verifying admin:', error);
    return { error: 'Internal Server Error', status: 500 };
  }
}

async function resolveFirestoreUser(adminDb, uid) {
  const byId = await adminDb.collection('users').doc(uid).get();
  if (byId.exists) {
    return { docRef: byId.ref, data: byId.data(), docId: byId.id };
  }

  const byUid = await adminDb.collection('users').where('uid', '==', uid).limit(1).get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { docRef: doc.ref, data: doc.data(), docId: doc.id };
  }

  const byAuthUid = await adminDb.collection('users').where('authUid', '==', uid).limit(1).get();
  if (!byAuthUid.empty) {
    const doc = byAuthUid.docs[0];
    return { docRef: doc.ref, data: doc.data(), docId: doc.id };
  }

  return null;
}

async function resolveAuthUid(uid, fallbackEmail) {
  try {
    const user = await admin.auth().getUser(uid);
    return { authUid: user.uid, authExists: true };
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (!fallbackEmail) {
    return { authUid: uid, authExists: false };
  }

  try {
    const byEmail = await admin.auth().getUserByEmail(fallbackEmail);
    return { authUid: byEmail.uid, authExists: true };
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }
    return { authUid: uid, authExists: false };
  }
}

export async function GET(req) {
  try {
    const adminVerification = await verifyAdmin(req);
    if (adminVerification.error) {
      return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
    }

    const users = await listAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const adminVerification = await verifyAdmin(req);
    if (adminVerification.error) {
      return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
    }

    const payload = await req.json();
    const validated = validateAdminUpdatePayload(payload);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status || 400 });
    }

    const { uid, updateData } = validated.data;

    const adminDb = admin.firestore();
    const firestoreUser = await resolveFirestoreUser(adminDb, uid);
    const fallbackEmail = updateData.email || firestoreUser?.data?.email || null;
    const { authUid, authExists } = await resolveAuthUid(uid, fallbackEmail);

    const authUpdateData = {};
    const allowedAuthFields = ['displayName', 'email', 'photoURL', 'password', 'phoneNumber', 'disabled', 'emailVerified'];
    allowedAuthFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        authUpdateData[field] = updateData[field];
      }
    });

    if (authExists && Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(authUid, authUpdateData);
    }

    const docRef = firestoreUser?.docRef || adminDb.collection('users').doc(uid);
    await docRef.set(
      {
        ...updateData,
        uid: firestoreUser?.data?.uid || authUid || uid,
        authUid: authExists ? authUid : null,
      },
      { merge: true }
    );

    if (Object.prototype.hasOwnProperty.call(updateData, 'role')) {
      if (!authExists) {
        return NextResponse.json({ error: `User ${uid} has no Auth account — cannot set custom claims.` }, { status: 400 });
      }
      await admin.auth().setCustomUserClaims(authUid, { role: updateData.role });
    }

    return NextResponse.json({
      message: `User ${uid} updated successfully`,
      authExists,
      authUid: authExists ? authUid : null,
      firestoreDocId: firestoreUser?.docId || uid,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const adminVerification = await verifyAdmin(req);
    if (adminVerification.error) {
      return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
    }

    const payload = await req.json();
    const validated = validateAdminDeletePayload(payload);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status || 400 });
    }

    const { uid } = validated.data;

    const adminDb = admin.firestore();
    const firestoreUser = await resolveFirestoreUser(adminDb, uid);
    const fallbackEmail = firestoreUser?.data?.email || null;
    const { authUid } = await resolveAuthUid(uid, fallbackEmail);

    try {
      await admin.auth().deleteUser(authUid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (firestoreUser?.docRef) {
      await firestoreUser.docRef.delete();
      await adminDb.collection('leaderboard').doc(firestoreUser.docId).delete();
    } else {
      await adminDb.collection('users').doc(uid).delete();
      await adminDb.collection('leaderboard').doc(uid).delete();
    }

    return NextResponse.json({ message: `User ${uid} deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

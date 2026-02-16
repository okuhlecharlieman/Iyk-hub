
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { listAllUsers } from '../../../../lib/firebase/admin';

async function verifyAdmin(req) {
    await initializeFirebaseAdmin();
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];

    if (!idToken) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerUid = decodedToken.uid;

        const adminDb = admin.firestore();
        const callerDocSnap = await adminDb.collection('users').doc(callerUid).get();

        if (!callerDocSnap.exists || callerDocSnap.data().role !== 'admin') {
            return { error: 'Forbidden', status: 403 };
        }
        return { success: true };
    } catch (error) {
        console.error('Error verifying admin:', error);
        return { error: 'Internal Server Error', status: 500 };
    }
}

export async function GET() {
    try {
        const users = await listAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const adminVerification = await verifyAdmin(req);
        if (adminVerification.error) {
            return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
        }

        const { uid, ...updateData } = await req.json();
        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        await admin.auth().updateUser(uid, updateData);
        if (updateData.role) {
             await admin.auth().setCustomUserClaims(uid, { role: updateData.role });
             const adminDb = admin.firestore();
             await adminDb.collection('users').doc(uid).set({ role: updateData.role }, { merge: true });
        }


        return NextResponse.json({ message: `User ${uid} updated successfully` });
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

        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        await admin.auth().deleteUser(uid);
         const adminDb = admin.firestore();
        await adminDb.collection('users').doc(uid).delete();


        return NextResponse.json({ message: `User ${uid} deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

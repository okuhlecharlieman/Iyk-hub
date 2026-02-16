
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { listAllUsers } from '../../../../lib/firebase/admin';

// This function verifies the admin status of the caller.
async function verifyAdmin(req) {
    await initializeFirebaseAdmin(); // Ensures Firebase Admin is initialized
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];

    if (!idToken) {
        return { error: 'Unauthorized', status: 401 };
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerUid = decodedToken.uid;

        const adminDb = admin.firestore();
        const callerDocSnap = await adminDb.collection('users').doc(callerUid).get();

        // Check if the user document exists and has the 'admin' role.
        if (!callerDocSnap.exists || callerDocSnap.data().role !== 'admin') {
            return { error: 'Forbidden', status: 403 };
        }
        return { success: true }; // User is verified as an admin
    } catch (error) {
        console.error('Error verifying admin:', error);
        return { error: 'Internal Server Error', status: 500 };
    }
}

// GET handler to retrieve all users.
export async function GET() {
    try {
        const users = await listAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return new NextResponse(error.message, { status: 500 });
    }
}

// PUT handler to update a user's data (e.g., role).
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

        // Update user in Firebase Authentication
        await admin.auth().updateUser(uid, updateData);

        // If a role is being updated, set custom claims and update Firestore.
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

// DELETE handler to remove a user.
export async function DELETE(req) {
    try {
        const adminVerification = await verifyAdmin(req);
        if (adminVerification.error) {
            return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
        }

        // Correctly get UID from the request body.
        const { uid } = await req.json(); 

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        const adminDb = admin.firestore();

        // Delete user from Firebase Authentication, Firestore users collection, and leaderboard collection.
        await admin.auth().deleteUser(uid);
        await adminDb.collection('users').doc(uid).delete();
        await adminDb.collection('leaderboard').doc(uid).delete();

        return NextResponse.json({ message: `User ${uid} deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

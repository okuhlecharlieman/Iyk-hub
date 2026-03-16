
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate } from '../../../../lib/firebase/admin';
import { listAllUsers } from '../../../../lib/firebase/admin';

// Re-uses centralized admin authentication logic (token + role/claim check).
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

// GET handler to retrieve all users.
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

// PUT handler to update a user's data (e.g., role, displayName).
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

        // Update user in Firebase Authentication (handles displayName, etc.)
        await admin.auth().updateUser(uid, updateData);

        const adminDb = admin.firestore();

        // Update the user document in Firestore to keep data consistent.
        await adminDb.collection('users').doc(uid).set(updateData, { merge: true });

        // If a role is being updated, also set custom claims for security rules.
        if (updateData.role) {
             await admin.auth().setCustomUserClaims(uid, { role: updateData.role });
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

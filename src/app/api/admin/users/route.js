
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

        try {
            await admin.auth().deleteUser(uid);
        } catch (error) {
            if (error?.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        await adminDb.collection('users').doc(uid).delete();
        await adminDb.collection('leaderboard').doc(uid).delete();

        return NextResponse.json({ message: `User ${uid} deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

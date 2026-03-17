
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin, listAllUsers } from '../../../../lib/firebase/admin';

// Helper to ensure Firebase Admin is initialized
async function ensureAdminInitialized() {
  // In a serverless environment, this function might run multiple times.
  // We check if an app is already initialized to avoid errors.
  if (!admin.apps.length) {
    await initializeFirebaseAdmin();
  }
}

// Re-uses centralized admin authentication logic (token + role/claim check).
async function verifyAdmin(req) {
    try {
        // This will check for a valid Firebase session token and if the user has an 'admin' role.
        await authenticate(req);
        return { success: true };
    } catch (error) {
        if (error?.code === 401 || error?.code === 403) {
            return { error: error.message, status: error.code };
        }
        // For any other errors, log them and return a generic server error.
        console.error('Error verifying admin:', error);
        return { error: 'Internal Server Error', status: 500 };
    }
}

// GET handler to retrieve all users.
export async function GET(req) {
    try {
        await ensureAdminInitialized();
        const adminVerification = await verifyAdmin(req);
        if (adminVerification.error) {
            return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
        }

        // listAllUsers is assumed to be a helper that fetches from both Auth and Firestore
        const users = await listAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// PUT handler to update a user.
export async function PUT(req) {
    try {
        await ensureAdminInitialized();
        const adminVerification = await verifyAdmin(req);
        if (adminVerification.error) {
            return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
        }

        const { uid, ...updateData } = await req.json();
        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        // Update Firebase Auth user
        const authUpdateData = {};
        const allowedAuthFields = ['displayName', 'email', 'photoURL', 'password', 'phoneNumber', 'disabled', 'emailVerified'];
        allowedAuthFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(updateData, field)) {
                authUpdateData[field] = updateData[field];
            }
        });

        let authExists = false;
        try {
            await admin.auth().getUser(uid);
            authExists = true;

            if (Object.keys(authUpdateData).length > 0) {
                await admin.auth().updateUser(uid, authUpdateData);
            }

            // Handle role update via custom claims
            if (Object.prototype.hasOwnProperty.call(updateData, 'role')) {
                await admin.auth().setCustomUserClaims(uid, { role: updateData.role });
            }
        } catch (error) {
            if (error?.code !== 'auth/user-not-found') {
                throw error; // Re-throw unexpected auth errors
            }
            // if user not in Auth, we can still proceed to update firestore
            console.warn(`Firebase Auth user with UID: ${uid} not found.`);
        }

        // Update Firestore user document
        const adminDb = admin.firestore();
        await adminDb.collection('users').doc(uid).set(updateData, { merge: true });

        return NextResponse.json({ message: `User ${uid} updated successfully`, authExists });

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE handler to delete a user.
export async function DELETE(req) {
    try {
        await ensureAdminInitialized();
        const adminVerification = await verifyAdmin(req);
        if (adminVerification.error) {
            return NextResponse.json({ error: adminVerification.error }, { status: adminVerification.status });
        }

        const { uid } = await req.json();
        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        // Delete from Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
        } catch (error) {
            // Ignore if user not found, but throw other errors
            if (error?.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        // Delete from Firestore
        const adminDb = admin.firestore();
        await adminDb.collection('users').doc(uid).delete();
        await adminDb.collection('leaderboard').doc(uid).delete(); // Also remove from leaderboard

        return NextResponse.json({ message: `User ${uid} deleted successfully` });

    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

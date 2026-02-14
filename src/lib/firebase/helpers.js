import { doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';

export async function ensureUserDoc(user) {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        // Document doesn't exist, create it.
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date(),
            role: 'user', // Default role
        });
    }
}

export async function createOpportunity(data) {
    await addDoc(collection(db, 'opportunities'), data);
}

export async function updateOpportunity(id, data) {
    const oppRef = doc(db, 'opportunities', id);
    await updateDoc(oppRef, data);
}

export async function deleteOpportunity(id) {
    const oppRef = doc(db, 'opportunities', id);
    await deleteDoc(oppRef);
}

export async function approveOpportunity(id) {
    await updateOpportunity(id, { status: 'approved' });
}

export async function rejectOpportunity(id) {
    await updateOpportunity(id, { status: 'rejected' });
}

export function onOpportunitiesUpdate(isAdmin, user, callback, errorCallback) {
    let q = query(collection(db, 'opportunities'));

    if (!isAdmin) {
        q = query(q, where('status', 'in', ['approved', 'pending']), where('ownerId', '==', user.uid));
    }

    return onSnapshot(q, (snapshot) => {
        const opportunities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(opportunities);
    }, errorCallback);
}

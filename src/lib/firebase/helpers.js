import { doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc, onSnapshot, query, where, getDocs, runTransaction } from 'firebase/firestore';
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

export async function getUserDoc(uid) {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

export async function updateUserDoc(uid, data) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}


export async function listUserShowcasePosts(uid) {
    const q = query(collection(db, 'showcase'), where('ownerId', '==', uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function listShowcasePosts(limit = 100) {
    const q = query(collection(db, 'showcase'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteShowcasePost(postId) {
    const postRef = doc(db, 'showcase', postId);
    await deleteDoc(postRef);
}

export async function updateShowcasePost(postId, data) {
    const postRef = doc(db, 'showcase', postId);
    await updateDoc(postRef, data);
}

export async function togglePostVote(postId, userId) {
    const postRef = doc(db, "showcase", postId);

    await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
            throw "Post does not exist!";
        }

        const postData = postDoc.data();
        const currentVotes = postData.votes || [];
        const userVoteIndex = currentVotes.indexOf(userId);

        let newVotes;
        if (userVoteIndex === -1) {
            // User hasn't voted, add vote.
            newVotes = [...currentVotes, userId];
        } else {
            // User has voted, remove vote.
            newVotes = currentVotes.filter((uid) => uid !== userId);
        }

        transaction.update(postRef, { votes: newVotes });
    });
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

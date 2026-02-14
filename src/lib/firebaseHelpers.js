// src/lib/helpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc, onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// NOTE: This file should ONLY contain client-side safe Firebase functions.

// Users
export async function ensureUserDoc(user) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || 'Intwana',
      email: user.email || null,
      photoURL: user.photoURL || null,
      points: { weekly: 0, lifetime: 0 },
      bio: '',
      skills: [],
      role: 'user',
      createdAt: serverTimestamp(),
    });
  }
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    return {
      id: uid,
      ...data,
      isAdmin: data.role === 'admin',
    };
  }
  return null;
}

export async function updateUserDoc(uid, data) {
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export async function listTopUsers(limitN = 10, filter = 'lifetime') {
  const orderByField = `points.${filter}`;
  const qy = query(collection(db, 'users'), orderBy(orderByField, 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Admin function to get all users
export async function listAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Showcase
export async function createShowcasePost(data, mediaFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  let mediaUrl = null;
  if (mediaFile) {
    mediaUrl = await uploadToStorage(mediaFile, `showcase/${user.uid}`);
  }

  const postData = {
    ...data,
    uid: user.uid,
    votes: 0,
    voters: [],
    mediaUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const postRef = await addDoc(collection(db, 'wallPosts'), postData);
  return postRef.id;
}

export async function listUserShowcasePosts(uid, limitN = 50) {
    const qy = query(collection(db, 'wallPosts'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteShowcasePost(postId) {
    await deleteDoc(doc(db, 'wallPosts', postId));
}

export async function updateShowcasePost(postId, data) {
    const postRef = doc(db, 'wallPosts', postId);
    await updateDoc(postRef, { ...data, updatedAt: serverTimestamp() });
}

export async function togglePostVote(postId, uid) {
  const postRef = doc(db, "wallPosts", postId);
  return runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) {
      throw "Post does not exist!";
    }

    const data = postDoc.data();
    const voters = data.voters || [];
    let newVotes = data.votes || 0;

    if (voters.includes(uid)) {
      // User is unvoting
      transaction.update(postRef, {
        voters: voters.filter(voterId => voterId !== uid),
        votes: newVotes - 1,
      });
    } else {
      // User is voting
      transaction.update(postRef, {
        voters: [...voters, uid],
        votes: newVotes + 1,
      });
    }
  });
}

// Opportunities

// Admin function to get all opportunities
export async function listAllOpportunities() {
    const qy = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createOpportunity(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const oppData = {
    ...data,
    ownerId: user.uid,
    status: 'pending', // Or 'approved' if you want to bypass approval for some users
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'opportunities'), oppData);
  return docRef.id;
}

export async function updateOpportunity(opportunityId, data) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteOpportunity(opportunityId) {
  await deleteDoc(doc(db, 'opportunities', opportunityId));
}

// Client-side real-time listener
export function onOpportunitiesUpdate(isAdmin, user, callback, onError) {
  let qy;
  if (isAdmin) {
    qy = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
  } else {
    qy = query(
      collection(db, 'opportunities'),
      where('status', 'in', ['approved', 'pending']),
      orderBy('createdAt', 'desc')
    );
  }

  const unsubscribe = onSnapshot(qy, (querySnapshot) => {
    const opportunities = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(opp => isAdmin || opp.status === 'approved' || opp.ownerId === user?.uid);

    callback(opportunities);
  }, (error) => {
    console.error("Error in onOpportunitiesUpdate listener:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
}


export async function approveOpportunity(opportunityId) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { status: 'approved', updatedAt: serverTimestamp() });
}

export async function rejectOpportunity(opportunityId) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { status: 'rejected', updatedAt: serverTimestamp() });
}

// Quotes
export async function fetchLatestQuote() {
  const qy = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) {
    return null;
  }
  const quoteDoc = snap.docs[0];
  return { id: quoteDoc.id, ...quoteDoc.data() };
}


// Storage
export async function uploadToStorage(file, prefix = 'uploads') {
  if(!file) return null;
  const fileRef = ref(storage, `${prefix}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

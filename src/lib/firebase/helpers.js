import { auth, db, storage } from './../firebase';
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
      role: 'user', // Default role for new users
      createdAt: serverTimestamp(),
    });
  }
}

export async function updateUserDoc(uid, data) {
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export async function listTopUsers(limitN = 10, filter = 'lifetime') {
  const page = await listTopUsersPage({ limit: limitN, filter });
  return page.users;
}

export async function listTopUsersPage({ limit = 10, filter = 'lifetime', cursor = null } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    filter,
  });

  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`/api/leaderboard?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || json?.message || 'Failed to fetch leaderboard');
  }

  return { users: json.users || [], nextCursor: json.nextCursor || null };
}

// Admin function to get all users (server-composed — includes whether the user exists in Auth)
export async function listAllUsers() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const token = await currentUser.getIdToken();
  const res = await fetch('/api/list-users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || json?.message || 'Failed to fetch users');
  }
  return json.users; // objects include `id` and `authExists`
}

// Showcase
export async function createShowcasePost(data, mediaFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  let mediaUrl = null;
  if (mediaFile) {
    mediaUrl = await uploadToStorage(mediaFile, `showcase/${user.uid}`);
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/showcase/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...data, mediaUrl }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit showcase post');
  }

  return json.id;
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

  const token = await user.getIdToken();
  const res = await fetch('/api/opportunities/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to create opportunity');
  }

  return json.id;
}

export async function updateOpportunity(opportunityId, data) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteOpportunity(opportunityId) {
  await deleteDoc(doc(db, 'opportunities', opportunityId));
}

// Server-side function for fetching approved opportunities
export async function getApprovedOpportunities(limitN = 50) {
  const qy = query(collection(db, 'opportunities'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listOpportunitiesPage({ limit = 12, cursor = null } = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`/api/opportunities?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch opportunities');
  }

  return { opportunities: json.opportunities || [], nextCursor: json.nextCursor || null };
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

// Client-side real-time listener for users collection (admin UI)
export function onUsersUpdate(callback, onError) {
  const qy = query(collection(db, 'users'));
  const unsubscribe = onSnapshot(qy, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(users);
  }, (error) => {
    console.error('Error in onUsersUpdate listener:', error);
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

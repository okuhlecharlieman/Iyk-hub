// src/lib/firebaseHelpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, increment, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Users
export async function ensureUserDoc(user) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    // Create new document for new users
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
  } else {
    // For existing users, check and add missing fields like email
    const data = snap.data();
    const updates = {};
    if (!data.email && user.email) {
      updates.email = user.email;
    }
    // Also, handle the points migration from a number to an object
    if (typeof data.points === 'number') {
      updates.points = { weekly: data.points || 0, lifetime: data.points || 0 };
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  }
}
export async function getUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}
export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// This is the client-side safe version. 
// The admin page uses a secure API route for a complete user list.
export async function listAllUsers() {
  const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteUser(uid) {
  // Note: For full user deletion including Auth, this should be a secure API call.
  await deleteDoc(doc(db, 'users', uid));
}

// Points
async function logPoints(uid, amount, reason, customId) {
  const col = collection(db, 'users', uid, 'pointsLog');
  if (customId) {
    await setDoc(doc(col, customId), { amount, reason, createdAt: serverTimestamp() });
  } else {
    await addDoc(col, { amount, reason, createdAt: serverTimestamp() });
  }
}
export async function awardPoints(uid, amount, reason) {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('User not found');
    const data = snap.data();
    const prevPoints = data.points || { weekly: 0, lifetime: 0 };
    const weekly = (prevPoints.weekly || 0) + amount;
    const lifetime = (prevPoints.lifetime || 0) + amount;
    tx.update(userRef, { points: { weekly, lifetime } });
  });
  await logPoints(uid, amount, reason);
}

export async function awardDailyLogin(uid) {
  const today = new Date().toISOString().slice(0, 10);
  const logId = `daily-${today}`;
  const logRef = doc(db, 'users', uid, 'pointsLog', logId);
  const snap = await getDoc(logRef);
  if (!snap.exists()) {
    await setDoc(logRef, { amount: 5, reason: 'Daily login', createdAt: serverTimestamp() });
    await awardPoints(uid, 5, 'Daily login');
  }
}
export async function awardGamePoints(uid, game, score) {
  const amt = Math.min(10, Math.max(1, Math.round(score || 1)));
  await awardPoints(uid, amt, `Game: ${game}`);
}
// Award points for showcase uploads (e.g. art, code, music)
export async function awardUploadPoints(uid, amount = 5, reason = 'Showcase upload') {
  await awardPoints(uid, amount, reason);
}

// Quotes
export async function fetchLatestQuote() {
  const qy = query(collection(db, 'quotes')), // optional order if you store day
        snap = await getDocs(qy);
  return snap.docs[0]?.data() || { text: 'Keep going. Keep growing.' };
}

// Opportunities
export async function submitOpportunity(data, uid, id = null, isEdit = false) {
    const cleanData = { ...data };
    const tags = Array.isArray(cleanData.tags) ? cleanData.tags : (cleanData.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    
    if (isEdit && id) {
        const ref = doc(db, 'opportunities', id);
        const { id: _id, createdAt, status, ...rest } = cleanData;
        await updateDoc(ref, { ...rest, tags, updatedAt: serverTimestamp() });
        return ref;
    } else {
        return addDoc(collection(db, 'opportunities'), {
            ...cleanData,
            tags,
            status: 'pending',
            createdAt: serverTimestamp(),
            createdBy: uid || null,
            ownerId: uid || null,
        });
    }
}
export async function listApprovedOpportunities(limitN = 50) {
  const qy = query(
    collection(db, 'opportunities'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listPendingOpportunities(limitN = 50) {
  const qy = query(
    collection(db, 'opportunities'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function approveOpportunity(id) {
  await updateDoc(doc(db, 'opportunities', id), { status: 'approved' });
}
export async function rejectOpportunity(id) {
  await updateDoc(doc(db, 'opportunities', id), { status: 'rejected' });
}

// Showcase
export async function createShowcasePost({ type, title, description, mediaUrl, code, language }, uid) {
  return addDoc(collection(db, 'wallPosts'), {
    uid,
    type,
    title: title || '',
    description: description || '',
    mediaUrl: mediaUrl || null,
    code: code || null,
    language: language || null,
    reactions: { '❤️': 0, '🎉': 0, '👍': 0 },
    visibility: 'public',
    createdAt: serverTimestamp(),
  });
}
export async function listShowcasePosts(limitN = 50) {
  const qy = query(collection(db, 'wallPosts'), orderBy('createdAt', 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listUserShowcasePosts(uid, limitN = 50) {
  const qy = query(
    collection(db, 'wallPosts'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function reactToPost(postId, emoji) {
  const refDoc = doc(db, 'wallPosts', postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(refDoc);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = data.reactions || {};
    const curr = reactions[emoji] || 0;
    tx.update(refDoc, { reactions: { ...reactions, [emoji]: curr + 1 } });
  });
}

// Storage
export async function uploadToStorage(file, prefix = 'uploads') {
  const fileRef = ref(storage, `${prefix}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

// Games session log (optional)
export async function logGameSession(uid, game, score, duration) {
  await addDoc(collection(db, 'gamesSessions'), {
    uid,
    game,
    score: score || 0,
    duration: duration || 0,
    createdAt: serverTimestamp(),
  });
}

// Leaderboard
export async function listTopUsers(limitN = 20, filter = 'lifetime') {
  const field = filter === 'weekly' ? 'points.weekly' : 'points.lifetime';
  const qy = query(collection(db, 'users'), orderBy(field, 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

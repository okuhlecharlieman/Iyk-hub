// src/lib/firebaseHelpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, increment, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Users
export async function ensureUserDoc(user) {
  if (!user) return;
  const refDoc = doc(db, 'users', user.uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) {
    await setDoc(refDoc, {
      displayName: user.displayName || 'Intwana',
      photoURL: user.photoURL || null,
      points: 0,
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
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}
export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
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
    const prevPoints = data.points || {};
    const weekly = (prevPoints.weekly || 0) + amount;
    const lifetime = (prevPoints.lifetime || 0) + amount;
    tx.update(userRef, { points: { weekly, lifetime } });
  });
  await logPoints(uid, amount, reason);
}

export async function migrateUserPoints(uid) {
  // For migration: convert flat points to { weekly, lifetime }
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (typeof data.points === 'number') {
      tx.update(userRef, { points: { weekly: data.points, lifetime: data.points } });
    }
  });
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
  if (isEdit && id) {
    // Edit existing opportunity
    const ref = doc(db, 'opportunities', id);
    // Remove fields that shouldn't be overwritten
    const { id: _id, createdAt, status, ...rest } = data;
    await updateDoc(ref, {
      ...rest,
      tags: Array.isArray(rest.tags) ? rest.tags : (rest.tags || '').split(',').map(t=>t.trim()).filter(Boolean),
      updatedAt: serverTimestamp(),
    });
    return ref;
  } else {
    // New opportunity
    return addDoc(collection(db, 'opportunities'), {
      ...data,
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

// Wall
export async function createWallPost({ type, title, description, mediaUrl, code, language }, uid) {
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
export async function listWallPosts(limitN = 50) {
  const qy = query(collection(db, 'wallPosts'), orderBy('createdAt', 'desc'), limit(limitN));
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
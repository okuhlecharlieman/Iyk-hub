import { auth, db } from './../firebase';
import {
  collection, doc, getDoc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc, onSnapshot
} from 'firebase/firestore';

// NOTE: This file should ONLY contain client-side safe Firebase functions.

export async function ensureUserDoc(user, profile = {}) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: profile.displayName || user.displayName || 'Intwana',
      email: user.email || null,
      photoURL: profile.photoURL || user.photoURL || null,
      points: { weekly: 0, lifetime: 0 },
      bio: '',
      skills: [],
      role: 'user', // Default role for new users
      createdAt: serverTimestamp(),
    });
  } else if (profile.displayName || profile.photoURL) {
    // Update existing document with profile data if provided
    const updateData = {};
    if (profile.displayName) updateData.displayName = profile.displayName;
    if (profile.photoURL) updateData.photoURL = profile.photoURL;
    if (Object.keys(updateData).length > 0) {
      await updateDoc(userRef, updateData);
    }
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

// Admin function to get all users (server-composed — includes linked Auth UID when available)
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
  return json.users; // objects include `id` and `authUid` when linked to Firebase Auth
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

  return { id: json.id, mediaUrl: mediaUrl || null };
}

export async function listUserShowcasePosts(uid, limitN = 50) {
    const qy = query(collection(db, 'wallPosts'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const REACTION_FIELDS = {
  thumbsUp: { votersField: 'voters', countField: 'votes' },
  fire: { votersField: 'fireVoters', countField: 'fireCount' },
  heart: { votersField: 'heartVoters', countField: 'heartCount' },
};

export async function togglePostVote(postId, uid, reactionType = 'thumbsUp') {
  const postRef = doc(db, "wallPosts", postId);
  const fields = REACTION_FIELDS[reactionType] || REACTION_FIELDS.thumbsUp;
  const currentEmail = auth.currentUser?.email || null;
  const emailsField = `${fields.votersField}Emails`;

  return runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) {
      throw "Post does not exist!";
    }

    const data = postDoc.data();
    const voters = data[fields.votersField] || [];
    const voterEmails = data[emailsField] || [];

    if (voters.includes(uid)) {
      // User is removing their vote
      const newVoters = voters.filter(voterId => voterId !== uid);
      const newEmails = currentEmail ? voterEmails.filter(e => e !== currentEmail) : voterEmails;
      transaction.update(postRef, {
        [fields.votersField]: newVoters,
        [fields.countField]: newVoters.length,
        [emailsField]: newEmails,
      });
    } else {
      // Prevent double-voting from same email with different auth provider
      if (currentEmail && voterEmails.includes(currentEmail)) {
        throw new Error('You have already reacted with another account using the same email.');
      }
      const newVoters = [...voters, uid];
      const newEmails = currentEmail ? [...voterEmails, currentEmail] : voterEmails;
      transaction.update(postRef, {
        [fields.votersField]: newVoters,
        [fields.countField]: newVoters.length,
        [emailsField]: newEmails,
      });
    }
  });
}

// Opportunities

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

  return { id: json.id || json.opportunityId };
}

export async function updateOpportunity(opportunityId, data) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteOpportunity(opportunityId) {
  await deleteDoc(doc(db, 'opportunities', opportunityId));
}

export async function listOpportunitiesPage({ limit: limitN = 12, cursor = null } = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    const token = await user.getIdToken();
    const params = new URLSearchParams({ limit: String(limitN) });
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
  } catch {
    try {
      const qy = query(
        collection(db, 'opportunities'),
        where('status', '==', 'approved'),
        limit(limitN)
      );
      const snap = await getDocs(qy);
      const opportunities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { opportunities, nextCursor: null };
    } catch {
      return { opportunities: [], nextCursor: null };
    }
  }
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
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const res = await fetch('/api/admin/opportunities', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id: opportunityId, status: 'approved' }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to approve opportunity');
  }

  return json;
}

export async function rejectOpportunity(opportunityId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const res = await fetch('/api/admin/opportunities', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id: opportunityId, status: 'rejected' }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to reject opportunity');
  }

  return json;
}

// Streaks & Activity
export async function recordDailyLogin(uid) {
  if (!uid) return null;

  const streakRef = doc(db, 'users', uid);
  const today = new Date().toISOString().slice(0, 10);

  return runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(streakRef);
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    const streak = data.streak || { current: 0, longest: 0, lastLoginDate: null };

    if (streak.lastLoginDate === today) {
      return streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newCurrent = 1;
    if (streak.lastLoginDate === yesterdayStr) {
      newCurrent = (streak.current || 0) + 1;
    }

    const newLongest = Math.max(newCurrent, streak.longest || 0);

    const newStreak = {
      current: newCurrent,
      longest: newLongest,
      lastLoginDate: today,
    };

    transaction.update(streakRef, { streak: newStreak });
    return newStreak;
  });
}

export function getAchievements(userProfile) {
  const achievements = [];
  const streak = userProfile?.streak || {};
  const points = userProfile?.points || {};

  if (streak.current >= 3) achievements.push({ id: 'streak3', label: '3-Day Streak', icon: '🔥', color: 'orange' });
  if (streak.current >= 7) achievements.push({ id: 'streak7', label: 'Week Warrior', icon: '⚡', color: 'yellow' });
  if (streak.current >= 30) achievements.push({ id: 'streak30', label: 'Monthly Master', icon: '🏆', color: 'amber' });
  if ((streak.longest || 0) >= 14) achievements.push({ id: 'dedicated', label: 'Dedicated', icon: '💪', color: 'blue' });
  if ((points.total || 0) >= 100) achievements.push({ id: 'centurion', label: 'Centurion', icon: '💯', color: 'purple' });
  if ((points.total || 0) >= 500) achievements.push({ id: 'elite', label: 'Elite', icon: '👑', color: 'gold' });

  return achievements;
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
const IMAGE_UPLOAD_CONTEXTS = {
  challenges: 'sponsored-challenges',
  opportunities: 'opportunities',
  showcase: 'showcase',
};

const resolveImageUploadContext = (prefix = 'uploads') => {
  const [basePrefix] = String(prefix || 'uploads').split('/');
  return IMAGE_UPLOAD_CONTEXTS[basePrefix] || basePrefix || 'uploads';
};

export async function uploadToStorage(file, prefix = 'uploads') {
  if (!file) return null;

  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Auto-compress images before upload
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      const { compressImage } = await import('../imageCompression');
      fileToUpload = await compressImage(file);
    } catch {
      // Fall back to original file if compression fails
    }
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('context', resolveImageUploadContext(prefix));

  const token = await user.getIdToken();
  const res = await fetch('/api/uploads/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to upload image');
  }

  return json.url;
}

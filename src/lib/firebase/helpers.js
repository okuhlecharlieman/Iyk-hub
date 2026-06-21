/**
 * Client-side Firebase helper functions.
 *
 * Contains all the data-access and utility functions used by React
 * components to interact with Firestore, Firebase Auth, and the app's
 * API routes.  Everything here runs in the browser — for server-side
 * helpers see `./admin.js`.
 */
import { auth, db } from './../firebase';
import {
  collection, doc, getDoc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc, onSnapshot
} from 'firebase/firestore';

// ─── User Documents ──────────────────────────────────────────────────

/**
 * Creates a user document in the `users` collection if one doesn't exist
 * yet for the given Firebase Auth user.  If the doc already exists and
 * new profile data is provided, it merges those fields in.
 *
 * Called after login/signup so every authenticated user has a Firestore doc.
 *
 * @param {import('firebase/auth').User} user     - The Firebase Auth user.
 * @param {Object}                       profile  - Optional overrides (displayName, photoURL).
 */
export async function ensureUserDoc(user, profile = {}) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    // First login — create the user document with defaults.
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
    // Merge new profile data into the existing document.
    const updateData = {};
    if (profile.displayName) updateData.displayName = profile.displayName;
    if (profile.photoURL) updateData.photoURL = profile.photoURL;
    if (Object.keys(updateData).length > 0) {
      await updateDoc(userRef, updateData);
    }
  }
}

/**
 * Updates arbitrary fields on a user's Firestore document.
 *
 * @param {string} uid  - The user's UID.
 * @param {Object} data - Key/value pairs to merge into the document.
 */
export async function updateUserDoc(uid, data) {
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

// ─── Leaderboard ─────────────────────────────────────────────────────

/**
 * Returns the top N users by points (convenience wrapper over listTopUsersPage).
 *
 * @param {number} limitN - Maximum number of users to return.
 * @param {string} filter - 'lifetime' or 'weekly'.
 * @returns {Promise<Object[]>} Ranked user objects.
 */
export async function listTopUsers(limitN = 10, filter = 'lifetime') {
  const page = await listTopUsersPage({ limit: limitN, filter });
  return page.users;
}

/**
 * Fetches a paginated leaderboard from the /api/leaderboard endpoint.
 *
 * @param {Object} options
 * @param {number} options.limit  - Page size (default 10).
 * @param {string} options.filter - 'lifetime' or 'weekly'.
 * @param {string} options.cursor - Pagination cursor from a previous call.
 * @returns {Promise<{users: Object[], nextCursor: string|null}>}
 */
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

// ─── Admin: User Management ─────────────────────────────────────────

/**
 * Fetches the full user list for the admin panel via /api/list-users.
 * Combines Firestore user docs with Firebase Auth records so each
 * object includes both `id` (Firestore doc ID) and `authUid` when
 * the user has a linked Auth account.
 *
 * @returns {Promise<Object[]>} Array of merged user objects.
 */
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
  return json.users;
}

// ─── Showcase ────────────────────────────────────────────────────────

/**
 * Creates a new showcase (wall) post. Optionally uploads a media file
 * first, then sends the post data to /api/showcase/submit.
 *
 * @param {Object} data      - Post data (title, description, category, link, etc.).
 * @param {File}   mediaFile - Optional image/video file to attach.
 * @returns {Promise<{id: string, mediaUrl: string|null}>} The new post's ID and media URL.
 */
export async function createShowcasePost(data, mediaFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Upload media file if provided.
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

/**
 * Lists a user's own showcase posts from Firestore, ordered newest-first.
 *
 * @param {string} uid    - The user's UID.
 * @param {number} limitN - Max number of posts to return (default 50).
 * @returns {Promise<Object[]>} Array of post objects with `id` field.
 */
export async function listUserShowcasePosts(uid, limitN = 50) {
    const qy = query(collection(db, 'wallPosts'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Mapping of reaction types to their Firestore field names.
 * Each reaction has a voters array field and a count field.
 */
const REACTION_FIELDS = {
  thumbsUp: { votersField: 'voters', countField: 'votes' },
  fire: { votersField: 'fireVoters', countField: 'fireCount' },
  heart: { votersField: 'heartVoters', countField: 'heartCount' },
};

/**
 * Toggles a reaction (thumbsUp, fire, heart) on a showcase post.
 * Uses a Firestore transaction to prevent race conditions.
 * Also tracks voter emails to prevent duplicate votes from
 * different auth providers using the same email.
 *
 * @param {string} postId       - The wallPosts document ID.
 * @param {string} uid          - The reacting user's UID.
 * @param {string} reactionType - 'thumbsUp', 'fire', or 'heart'.
 */
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
      // Remove vote — user already reacted.
      const newVoters = voters.filter(voterId => voterId !== uid);
      const newEmails = currentEmail ? voterEmails.filter(e => e !== currentEmail) : voterEmails;
      transaction.update(postRef, {
        [fields.votersField]: newVoters,
        [fields.countField]: newVoters.length,
        [emailsField]: newEmails,
      });
    } else {
      // Prevent double-voting from same email with different auth provider.
      if (currentEmail && voterEmails.includes(currentEmail)) {
        throw new Error('You have already reacted with another account using the same email.');
      }
      // Add vote.
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

// ─── Opportunities ───────────────────────────────────────────────────

/**
 * Submits a new opportunity via the /api/opportunities/submit endpoint.
 *
 * @param {Object} data - Opportunity fields (title, description, deadline, etc.).
 * @returns {Promise<{id: string}>} The new opportunity's ID.
 */
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

/**
 * Updates an existing opportunity document in Firestore.
 *
 * @param {string} opportunityId - The Firestore document ID.
 * @param {Object} data          - Fields to update.
 */
export async function updateOpportunity(opportunityId, data) {
  const docRef = doc(db, 'opportunities', opportunityId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Permanently deletes an opportunity document from Firestore.
 *
 * @param {string} opportunityId - The Firestore document ID.
 */
export async function deleteOpportunity(opportunityId) {
  await deleteDoc(doc(db, 'opportunities', opportunityId));
}

/**
 * Fetches a paginated list of approved opportunities from the API.
 * Falls back to a direct Firestore query if the API call fails.
 *
 * @param {Object} options
 * @param {number} options.limit  - Page size (default 12).
 * @param {string} options.cursor - Pagination cursor from a previous call.
 * @returns {Promise<{opportunities: Object[], nextCursor: string|null}>}
 */
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
    // Fallback: query Firestore directly if the API is unreachable.
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

// ─── Real-time Listeners ─────────────────────────────────────────────

/**
 * Subscribes to real-time changes on the `users` Firestore collection.
 * Used by the admin users page to keep the table in sync.
 *
 * @param {Function} callback - Called with the full user array whenever data changes.
 * @param {Function} onError  - Optional error handler.
 * @returns {Function} Unsubscribe function — call it to stop listening.
 */
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

/**
 * Admin action: approves an opportunity via the admin API.
 *
 * @param {string} opportunityId - The opportunity's document ID.
 * @returns {Promise<Object>} API response JSON.
 */
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

/**
 * Admin action: rejects an opportunity via the admin API.
 *
 * @param {string} opportunityId - The opportunity's document ID.
 * @returns {Promise<Object>} API response JSON.
 */
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

// ─── Streaks & Achievements ─────────────────────────────────────────

/**
 * Records a daily login and updates the user's streak counter.
 * Uses a Firestore transaction to avoid race conditions.
 *
 * - If the user already logged in today → no-op, returns current streak.
 * - If the user logged in yesterday → increments current streak.
 * - Otherwise → resets current streak to 1.
 *
 * @param {string} uid - The user's UID.
 * @returns {Promise<{current: number, longest: number, lastLoginDate: string}|null>}
 */
export async function recordDailyLogin(uid) {
  if (!uid) return null;

  const streakRef = doc(db, 'users', uid);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(streakRef);
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    const streak = data.streak || { current: 0, longest: 0, lastLoginDate: null };

    // Already logged in today — nothing to update.
    if (streak.lastLoginDate === today) {
      return streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Consecutive day? Increment. Otherwise reset to 1.
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

/**
 * Derives a list of achievement badges from a user's profile data
 * (streak and points).  Used to display badges on the profile page.
 *
 * @param {Object} userProfile - The user's Firestore document data.
 * @returns {Array<{id: string, label: string, icon: string, color: string}>}
 */
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

// ─── Quotes ──────────────────────────────────────────────────────────

/**
 * Fetches the most recently created quote from the `quotes` collection.
 *
 * @returns {Promise<{id: string, text?: string, author?: string}|null>}
 */
export async function fetchLatestQuote() {
  const qy = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(qy);
  if (snap.empty) {
    return null;
  }
  const quoteDoc = snap.docs[0];
  return { id: quoteDoc.id, ...quoteDoc.data() };
}

// ─── Storage / Image Upload ──────────────────────────────────────────

/** Maps upload path prefixes to server-side context labels. */
const IMAGE_UPLOAD_CONTEXTS = {
  challenges: 'sponsored-challenges',
  opportunities: 'opportunities',
  showcase: 'showcase',
};

/**
 * Resolves a file-path prefix into a known upload context string.
 * @param {string} prefix - The storage path prefix.
 * @returns {string} The context label for the upload API.
 */
const resolveImageUploadContext = (prefix = 'uploads') => {
  const [basePrefix] = String(prefix || 'uploads').split('/');
  return IMAGE_UPLOAD_CONTEXTS[basePrefix] || basePrefix || 'uploads';
};

/**
 * Uploads a file to cloud storage via the /api/uploads/images endpoint.
 * Images are automatically compressed before upload (except SVGs).
 *
 * @param {File}   file   - The file to upload.
 * @param {string} prefix - Path prefix (determines the storage context, e.g. 'showcase/uid').
 * @returns {Promise<string>} The publicly accessible URL of the uploaded file.
 */
export async function uploadToStorage(file, prefix = 'uploads') {
  if (!file) return null;

  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Auto-compress images before upload (skip SVGs).
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      const { compressImage } = await import('../imageCompression');
      fileToUpload = await compressImage(file);
    } catch {
      // Fall back to original file if compression fails.
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

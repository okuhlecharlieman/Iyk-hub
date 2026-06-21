'use client';
/**
 * Authentication context provider.
 *
 * Wraps the entire app and provides the current Firebase Auth user,
 * the user's Firestore profile document, admin status, and a loading
 * flag to any descendant component via the `useAuth()` hook.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc } from '../lib/firebase/helpers';
import { doc, onSnapshot } from 'firebase/firestore';
import { hasAdminDashboardAccess } from '../lib/roles';

/** React context that holds the current auth state for the entire app. */
const AuthContext = createContext({ 
  user: null,        // Firebase Auth user object (or null when signed out)
  userProfile: null,  // Firestore `users/{uid}` document data
  isAdmin: false,     // True if the user's role has admin dashboard access
  loading: true       // True while the initial auth check is in progress
});

/**
 * AuthProvider — wraps children with authentication state.
 *
 * Listens to Firebase Auth state changes and the user's Firestore
 * document in real time.  When the user logs in, it ensures a user
 * document exists (creating one with defaults if needed).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        await ensureUserDoc(currentUser, { displayName: currentUser.displayName, photoURL: currentUser.photoURL });

        const userRef = doc(db, 'users', currentUser.uid);
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const adminStatus = hasAdminDashboardAccess(data.role);
            setUserProfile({ id: snap.id, ...data });
            setIsAdmin(adminStatus);
            currentUser.getIdToken(true).catch(console.warn);
          } else {
            setUserProfile(null);
            setIsAdmin(false);
          }
          setUser(currentUser);
          setLoading(false);
        }, (err) => {
          console.error('Error listening to user profile:', err);
          setUserProfile(null);
          setIsAdmin(false);
          setUser(currentUser);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        if (unsubProfile) unsubProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Expose user, profile, loading status, AND the isAdmin boolean directly
  const value = { user, userProfile, loading, isAdmin };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook — provides { user, userProfile, loading, isAdmin }
 * from the nearest AuthProvider.
 *
 * @returns {{ user: Object|null, userProfile: Object|null, loading: boolean, isAdmin: boolean }}
 */
export function useAuth() {
  return useContext(AuthContext);
}

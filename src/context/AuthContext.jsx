'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc, getUserDoc } from '../lib/firebase/helpers';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({ user: null, userProfile: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await ensureUserDoc(currentUser);

        // Subscribe to Firestore `users/{uid}` so profile updates (like role changes)
        // are reflected immediately without requiring the user to re-login.
        const userRef = doc(db, 'users', currentUser.uid);
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile({ id: snap.id, ...data, isAdmin: data.role === 'admin' });
          } else {
            setUserProfile(null);
          }
        }, (err) => {
          console.error('Error listening to user profile:', err);
        });

        setUser(currentUser);
      } else {
        // No user is logged in.
        setUser(null);
        setUserProfile(null);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const value = { user, userProfile, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc, getUserDoc } from '../lib/firebaseHelpers';

const AuthContext = createContext({ user: null, userProfile: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If a user is logged in, we fetch their profile.
        // The race condition is avoided because we wait for the profile to be fetched
        // before setting loading to false.
        await ensureUserDoc(currentUser);
        const profile = await getUserDoc(currentUser.uid);
        setUserProfile(profile);
        setUser(currentUser);
      } else {
        // No user is logged in.
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
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

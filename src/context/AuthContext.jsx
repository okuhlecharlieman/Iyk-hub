'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc, getUserDoc } from '../lib/firebaseHelpers';

const AuthContext = createContext({ user: null, loading: true, userProfile: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        try {
          const userDoc = await ensureUserDoc(u);
          const profile = await getUserDoc(u.uid);
          setUserProfile(profile);
        } catch (e) {
          console.warn('Auth context setup failed', e);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user, userProfile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

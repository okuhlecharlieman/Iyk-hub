// src/context/AuthContext.jsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc } from '../lib/firebaseHelpers';
import { awardDailyLogin } from '../lib/firebaseHelpers';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        await ensureUserDoc(u);
        try {
          await awardDailyLogin(u.uid);
        } catch (e) {
          // silent fail for daily login
        }
      }
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
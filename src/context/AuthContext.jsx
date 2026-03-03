'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureUserDoc } from '../lib/firebase/helpers';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({ 
  user: null, 
  userProfile: null, 
  isAdmin: false, // Default isAdmin to false
  loading: true 
});

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
        await ensureUserDoc(currentUser);

        const userRef = doc(db, 'users', currentUser.uid);
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const adminStatus = data.role === 'admin';
            setUserProfile({ id: snap.id, ...data });
            setIsAdmin(adminStatus); // Set the isAdmin state
            
            // Optional: Force-refresh the ID token if role changes are reflected in custom claims
            currentUser.getIdToken(true).catch(console.warn);
          } else {
            setUserProfile(null);
            setIsAdmin(false);
          }
        }, (err) => {
          console.error('Error listening to user profile:', err);
          setUserProfile(null);
          setIsAdmin(false);
        });

        setUser(currentUser);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        if (unsubProfile) unsubProfile();
      }
      setLoading(false);
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

export function useAuth() {
  return useContext(AuthContext);
}

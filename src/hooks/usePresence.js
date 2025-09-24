'use client';
import { useEffect } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc, Timestamp, query, where, onSnapshot, collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

export function usePresence(setOnlineCount) {
  useEffect(() => {
    let cleanupFns = [];
    let uid = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Stop previous listeners on sign-out/switch
      cleanupFns.forEach((fn) => fn && fn());
      cleanupFns = [];

      if (!user) {
        uid = null;
        if (setOnlineCount) setOnlineCount(0);
        return;
      }

      uid = user.uid;
      const presenceRef = doc(db, 'presence', uid);
      const userRef = doc(db, 'users', uid);

      // Mark online and ensure user doc has basic fields
      await Promise.all([
        setDoc(presenceRef, { state: 'online', lastChanged: serverTimestamp() }, { merge: true }),
        setDoc(
          userRef,
          {
            displayName: user.displayName || 'Intwana',
            avatarURL: user.photoURL || null,
            points: { weekly: 0, lifetime: 0 },
            isOnline: true,
            lastActiveAt: serverTimestamp(),
          },
          { merge: true }
        ),
      ]);

      const heartbeat = setInterval(async () => {
        try {
          await Promise.all([
            setDoc(presenceRef, { state: 'online', lastChanged: serverTimestamp() }, { merge: true }),
            updateDoc(userRef, { lastActiveAt: serverTimestamp(), isOnline: true }),
          ]);
        } catch (e) {}
      }, 60 * 1000);

      const markOffline = async () => {
        try {
          await Promise.all([
            setDoc(presenceRef, { state: 'offline', lastChanged: serverTimestamp() }, { merge: true }),
            updateDoc(userRef, { isOnline: false, lastActiveAt: serverTimestamp() }),
          ]);
        } catch (e) {}
      };

      window.addEventListener('beforeunload', markOffline);
      const visHandler = async () => {
        try {
          await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
        } catch (e) {}
      };
      document.addEventListener('visibilitychange', visHandler);

      // Online count listener: consider users active in last 2 minutes
      const cutoffTs = () => Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('isOnline', '==', true));
      const unsubOnline = onSnapshot(q, (snap) => {
        let count = 0;
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d?.lastActiveAt?.toMillis && d.lastActiveAt.toMillis() >= cutoffTs().toMillis()) {
            count += 1;
          }
        });
        if (setOnlineCount) setOnlineCount(count);
      });

      cleanupFns.push(() => clearInterval(heartbeat));
      cleanupFns.push(() => window.removeEventListener('beforeunload', markOffline));
      cleanupFns.push(() => document.removeEventListener('visibilitychange', visHandler));
      cleanupFns.push(() => unsubOnline);
    });

    return () => {
      cleanupFns.forEach((fn) => fn && fn());
      if (unsubAuth) unsubAuth();
    };
  }, [setOnlineCount]);
}
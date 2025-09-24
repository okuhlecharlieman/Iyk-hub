'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeOnlineCount } from '../lib/presence';
import { auth } from '../lib/firebase';

export function usePresence(setOnlineCount) {
  useEffect(() => {
    let unsub = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (setOnlineCount) setOnlineCount(0);
        if (unsub) unsub();
        return;
      }
      if (unsub) unsub();
      unsub = subscribeOnlineCount(setOnlineCount);
    });
    return () => {
      if (unsub) unsub();
      if (unsubAuth) unsubAuth();
    };
  }, [setOnlineCount]);
}
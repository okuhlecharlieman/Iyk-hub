'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { startPresence, subscribeOnlineCount } from '../lib/presence';
import { auth } from '../lib/firebase';

export function usePresence(setOnlineCount) {
  useEffect(() => {
    let unsubPresence = null;
    let unsubCount = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clear previous subscriptions on auth change
      if (unsubPresence) unsubPresence();
      if (unsubCount) unsubCount();

      if (!user) {
        if (setOnlineCount) setOnlineCount(0);
        return;
      }

      // 1. Start tracking this user's presence state (handles reconnections automatically)
      unsubPresence = startPresence(user);

      // 2. Watch global database changes to aggregate total counts
      unsubCount = subscribeOnlineCount(setOnlineCount);
    });

    return () => {
      if (unsubPresence) unsubPresence();
      if (unsubCount) unsubCount();
      if (unsubAuth) unsubAuth();
    };
  }, [setOnlineCount]);
}

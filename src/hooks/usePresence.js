'use client';
import { useEffect } from 'react';
import { subscribeOnlineCount } from '../lib/presence';

export function usePresence(setOnlineCount) {
  useEffect(() => {
    if (!setOnlineCount) return undefined;

    const unsubCount = subscribeOnlineCount(setOnlineCount);

    return () => {
      if (unsubCount) unsubCount();
    };
  }, [setOnlineCount]);
}

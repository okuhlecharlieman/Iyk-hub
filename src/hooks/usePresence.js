'use client';
/**
 * usePresence custom React hook.
 */
import { useEffect } from 'react';
import { subscribeOnlineCount } from '../lib/presence';

/** usePresence — custom React hook. */
export function usePresence(setOnlineCount, asMap = false) {
  useEffect(() => {
    if (!setOnlineCount) return undefined;

    const unsubCount = subscribeOnlineCount((online) => {
        if (asMap) {
            setOnlineCount(online);
        } else {
            setOnlineCount(online instanceof Map ? online.size : online);
        }
    });

    return () => {
      if (unsubCount) unsubCount();
    };
  }, [setOnlineCount, asMap]);
}

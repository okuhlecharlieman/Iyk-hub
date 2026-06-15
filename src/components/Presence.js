"use client";
/**
 * Presence component.
 */
import { useEffect } from 'react';
import { startPresence } from '../lib/presence';

/** Presence React component. */
export default function Presence() {
  useEffect(() => {
    const stopPresence = startPresence();

    return () => {
      if (stopPresence) stopPresence();
    };
  }, []);

  return null;
}

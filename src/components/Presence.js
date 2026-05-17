
"use client";

import { useEffect } from 'react';
import { startPresence } from '../lib/presence';

export default function Presence() {
  useEffect(() => {
    const stopPresence = startPresence();

    return () => {
      if (stopPresence) stopPresence();
    };
  }, []);

  return null;
}

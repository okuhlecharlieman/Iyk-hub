
"use client";

import { useEffect } from 'react';
import { startPresence } from '../lib/presence';

export default function Presence() {
  useEffect(() => {
    startPresence();
  }, []);

  return null;
}

'use client';
import { useState, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';

export default function OnlineCount() {
  const [onlineCount, setOnlineCount] = useState(0);
  usePresence(setOnlineCount);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-green-50 text-green-700 px-3 py-1 text-sm border border-green-200">
      <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
      <span>{onlineCount} online</span>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';

export default function OnlineCount() {
  const [onlineCount, setOnlineCount] = useState(0);
  usePresence(setOnlineCount);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 text-sm border border-green-200 dark:border-green-700">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 dark:bg-green-300 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 dark:bg-green-400"></span>
      </span>
      <span>{onlineCount} online</span>
    </div>
  );
}
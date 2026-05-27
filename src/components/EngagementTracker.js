'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { trackPageView, trackSessionDuration } from '../lib/engagement';

export default function EngagementTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const sessionStart = useRef(Date.now());
  const lastPath = useRef(null);

  useEffect(() => {
    if (!user || !pathname) return;
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const page = pathname === '/' ? 'home' : pathname;
    trackPageView(user.uid, page);
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    sessionStart.current = Date.now();

    const handleBeforeUnload = () => {
      const duration = (Date.now() - sessionStart.current) / 1000;
      if (duration > 5) {
        trackSessionDuration(user.uid, duration);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const duration = (Date.now() - sessionStart.current) / 1000;
      if (duration > 5) {
        trackSessionDuration(user.uid, duration);
      }
    };
  }, [user]);

  return null;
}

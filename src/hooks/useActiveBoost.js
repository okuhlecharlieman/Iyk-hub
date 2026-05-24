'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useActiveBoost() {
  const { user } = useAuth();
  const [boost, setBoost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBoost(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBoost() {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/creator-boosts/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setBoost(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setBoost(data.active ? data.boost : null);
        }
      } catch (err) {
        // Suppress console noise for expected auth/network errors
        if (!cancelled) setBoost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBoost();
    return () => { cancelled = true; };
  }, [user]);

  return { boost, loading };
}

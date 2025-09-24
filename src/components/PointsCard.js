'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function PointsCard() {
  const [points, setPoints] = useState({ weekly: 0, lifetime: 0 });

  useEffect(() => {
    let unsubUserDoc = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPoints({ weekly: 0, lifetime: 0 });
        if (unsubUserDoc) unsubUserDoc();
        return;
      }
      const ref = doc(db, 'users', user.uid);
      unsubUserDoc = onSnapshot(ref, (snap) => {
        const data = snap.data() || {};
        const p = data.points || {};
        setPoints({ weekly: p.weekly || 0, lifetime: p.lifetime || 0 });
      });
    });

    return () => {
      if (unsubUserDoc) unsubUserDoc();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Points</h2>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded border p-4 text-center">
          <div className="text-2xl font-bold">{points.weekly}</div>
          <div className="text-sm text-neutral-600">This week</div>
        </div>
        <div className="rounded border p-4 text-center">
          <div className="text-2xl font-bold">{points.lifetime}</div>
          <div className="text-sm text-neutral-600">Lifetime</div>
        </div>
      </div>
    </div>
  );
}
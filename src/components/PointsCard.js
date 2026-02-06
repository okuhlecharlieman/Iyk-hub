'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { FaStar, FaCrown } from 'react-icons/fa';

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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Your Points</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4 text-center flex flex-col items-center justify-center">
          <FaStar className="text-yellow-400 dark:text-yellow-300 text-2xl mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{points.weekly}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">This week</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4 text-center flex flex-col items-center justify-center">
          <FaCrown className="text-amber-500 dark:text-amber-400 text-2xl mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{points.lifetime}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Lifetime</div>
        </div>
      </div>
    </div>
  );
}
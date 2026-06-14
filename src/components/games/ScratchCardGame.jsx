/**
 * ScratchCardGame — Daily scratch card game that replaces the spin wheel.
 * Players scratch a 3x3 grid to reveal symbols. Matching 3+ of the same symbol wins points.
 * One free play per 24 hours; extra plays can be purchased with points.
 *
 * Firestore collections used:
 *   - dailySpins/{uid}: tracks last play time and extra plays (shared with legacy spin data)
 *   - users/{uid}: points.lifetime and points.weekly are incremented on win
 */
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { trackEvent } from '../../lib/engagement';

const SPIN_COST = 10;
const SYMBOLS = ['💎', '⭐', '🎯', '🔥', '🍀', '💰'];
const PRIZES = { 3: 5, 4: 15, 5: 30, 6: 50, 7: 75, 8: 100, 9: 150 };

/** Generate a 3x3 grid of random symbols with slight weighting toward matches. */
function generateGrid() {
  const grid = [];
  const base = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  for (let i = 0; i < 9; i++) {
    // ~35% chance of the "base" symbol to make 3-matches achievable
    grid.push(Math.random() < 0.35 ? base : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return grid;
}

/** Count the most frequent symbol and return its count. */
function getBestMatch(grid) {
  const counts = {};
  grid.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
  return Math.max(...Object.values(counts));
}

export default function ScratchCardGame() {
  const { user } = useAuth();
  const [grid, setGrid] = useState(() => generateGrid());
  const [revealed, setRevealed] = useState(Array(9).fill(false));
  const [allRevealed, setAllRevealed] = useState(false);
  const [prize, setPrize] = useState(null);
  const [canPlay, setCanPlay] = useState(false);
  const [extraSpins, setExtraSpins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState('');
  const awarded = useRef(false);

  // Check daily cooldown
  const checkCooldown = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, 'dailySpins', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const lastPlayed = data.lastSpinAt?.toDate?.() || new Date(0);
        const hoursSince = (Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60);
        setExtraSpins(data.extraSpins || 0);
        setCanPlay(hoursSince >= 24 || (data.extraSpins || 0) > 0);
      } else {
        setCanPlay(true);
      }
    } catch {
      setCanPlay(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { checkCooldown(); }, [checkCooldown]);

  // Reveal a single cell
  const handleReveal = (idx) => {
    if (allRevealed || revealed[idx]) return;
    const next = [...revealed];
    next[idx] = true;
    setRevealed(next);

    if (next.every(Boolean)) {
      setAllRevealed(true);
      awardPrize();
    }
  };

  // Reveal all cells at once
  const handleRevealAll = () => {
    if (allRevealed) return;
    setRevealed(Array(9).fill(true));
    setAllRevealed(true);
    awardPrize();
  };

  // Award points based on matching symbols
  const awardPrize = async () => {
    if (awarded.current || !user) return;
    awarded.current = true;

    const matchCount = getBestMatch(grid);
    const points = PRIZES[matchCount] || 0;
    setPrize(points);

    try {
      const spinRef = doc(db, 'dailySpins', user.uid);
      const snap = await getDoc(spinRef);
      const data = snap.exists() ? snap.data() : {};
      const lastPlayed = data.lastSpinAt?.toDate?.() || new Date(0);
      const hoursSince = (Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60);

      if (hoursSince >= 24) {
        await setDoc(spinRef, { lastSpinAt: serverTimestamp(), extraSpins: data.extraSpins || 0 }, { merge: true });
      } else if ((data.extraSpins || 0) > 0) {
        await updateDoc(spinRef, { extraSpins: increment(-1) });
      }

      if (points > 0) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const weeklyPts = userSnap.data()?.points?.weekly || 0;
        const weeklyInc = Math.min(points, Math.max(0, weeklyPts + points) === weeklyPts + points ? points : points);

        await updateDoc(userRef, {
          'points.lifetime': increment(points),
          'points.weekly': increment(weeklyInc),
        });
        setMessage(`You matched ${matchCount} symbols and won ${points} points!`);
      } else {
        setMessage('No matches this time. Try again tomorrow!');
      }

      trackEvent(user.uid, 'scratch_card', { matchCount, points });
    } catch (err) {
      console.error('Error awarding scratch card prize:', err);
      setMessage('Points could not be saved. Please try again.');
    }
  };

  // Buy an extra play
  const handleBuyPlay = async () => {
    if (!user || buying) return;
    setBuying(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const pts = userSnap.data()?.points;
      if ((pts?.lifetime || 0) < SPIN_COST) {
        setMessage(`You need at least ${SPIN_COST} points to buy an extra play.`);
        setBuying(false);
        return;
      }

      const weeklyDeduction = Math.min(SPIN_COST, Math.max(0, pts?.weekly || 0));
      await updateDoc(userRef, {
        'points.lifetime': increment(-SPIN_COST),
        'points.weekly': increment(-weeklyDeduction),
      });

      const spinRef = doc(db, 'dailySpins', user.uid);
      await setDoc(spinRef, { extraSpins: increment(1) }, { merge: true });

      setExtraSpins((e) => e + 1);
      setCanPlay(true);
      trackEvent(user.uid, 'buy_scratch', { cost: SPIN_COST });
    } catch (err) {
      console.error('Error buying extra play:', err);
      setMessage('Failed to purchase. Try again.');
    }
    setBuying(false);
  };

  // Reset for a new game
  const handlePlayAgain = () => {
    awarded.current = false;
    setGrid(generateGrid());
    setRevealed(Array(9).fill(false));
    setAllRevealed(false);
    setPrize(null);
    setMessage('');
    checkCooldown();
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" /></div>;
  }

  return (
    <div className="text-center">
      {!canPlay && !allRevealed ? (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">Your daily scratch card resets in 24 hours.</p>
          <button
            onClick={handleBuyPlay}
            disabled={buying}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {buying ? 'Buying...' : `Buy Extra Play (${SPIN_COST} pts)`}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Scratch all cells to reveal your prize! Match 3+ symbols to win.</p>
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto mb-6">
            {grid.map((symbol, idx) => (
              <button
                key={idx}
                onClick={() => handleReveal(idx)}
                className={`aspect-square rounded-xl text-3xl font-bold transition-all duration-300 ${
                  revealed[idx]
                    ? 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 scale-100'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 hover:from-amber-200 hover:to-yellow-200 dark:hover:from-amber-800 dark:hover:to-yellow-800 cursor-pointer hover:scale-105'
                } shadow-md`}
              >
                {revealed[idx] ? symbol : '?'}
              </button>
            ))}
          </div>

          {!allRevealed && (
            <button
              onClick={handleRevealAll}
              className="px-5 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reveal All
            </button>
          )}

          {allRevealed && (
            <div className="mt-4 space-y-3">
              {prize > 0 ? (
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">🎉 You won {prize} points!</p>
              ) : (
                <p className="text-lg text-gray-600 dark:text-gray-400">Better luck next time!</p>
              )}
              {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
              <button
                onClick={handlePlayAgain}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-md hover:opacity-90 transition-all"
              >
                Play Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { trackEvent } from '../../lib/engagement';

const SEGMENTS = [
  { label: '5 pts', points: 5, color: '#3b82f6' },
  { label: '10 pts', points: 10, color: '#10b981' },
  { label: 'Better Luck\nTomorrow', points: 0, color: '#ef4444' },
  { label: '50 pts', points: 50, color: '#f59e0b' },
  { label: '5 pts', points: 5, color: '#8b5cf6' },
  { label: '10 pts', points: 10, color: '#06b6d4' },
  { label: 'Better Luck\nTomorrow', points: 0, color: '#ec4899' },
  { label: '5 pts', points: 5, color: '#f97316' },
];

const WEIGHTS = [30, 25, 20, 5, 30, 25, 20, 30];
const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);
const SPIN_COST = 10;

function pickSegment() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < WEIGHTS.length; i++) {
    rand -= WEIGHTS[i];
    if (rand <= 0) return i;
  }
  return 0;
}

export default function SpinWheelGame() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [canSpin, setCanSpin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [nextSpinTime, setNextSpinTime] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [extraSpins, setExtraSpins] = useState(0);
  const [buyingSpins, setBuyingSpins] = useState(false);
  const animRef = useRef(null);

  const checkSpinEligibility = useCallback(async () => {
    if (!user) return;
    try {
      const spinRef = doc(db, 'dailySpins', user.uid);
      const spinDoc = await getDoc(spinRef);

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUserPoints(userDoc.data()?.points?.lifetime || 0);
      }

      if (!spinDoc.exists()) {
        setCanSpin(true);
        setExtraSpins(0);
        setLoading(false);
        return;
      }
      const data = spinDoc.data();
      const extra = data.extraSpins || 0;
      setExtraSpins(extra);
      const lastSpin = data.lastSpinAt?.toDate();
      if (!lastSpin) {
        setCanSpin(true);
        setLoading(false);
        return;
      }
      const hoursSince = (Date.now() - lastSpin.getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 24 || extra > 0) {
        setCanSpin(true);
      } else {
        setCanSpin(false);
        setNextSpinTime(new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000));
      }
    } catch (err) {
      console.error('Error checking spin eligibility:', err);
      setCanSpin(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkSpinEligibility();
  }, [checkSpinEligibility]);

  const drawWheel = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segCount = SEGMENTS.length;
    const segAngle = (2 * Math.PI) / segCount;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    SEGMENTS.forEach((seg, i) => {
      const start = i * segAngle - Math.PI / 2;
      const end = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      const lines = seg.label.split('\n');
      lines.forEach((line, li) => {
        ctx.fillText(line, radius * 0.6, (li - (lines.length - 1) / 2) * 16);
      });
      ctx.restore();
    });

    ctx.restore();

    // Pointer at top (12 o'clock)
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center - 12, 25);
    ctx.lineTo(center + 12, 25);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawWheel(rotation);
  }, [drawWheel, rotation]);

  const handleSpin = async () => {
    if (!user || spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);

    const winIndex = pickSegment();
    const segAngle = (2 * Math.PI) / SEGMENTS.length;
    // Target: align segment center to top (12 o'clock = -PI/2)
    // The segment at index winIndex occupies [winIndex*segAngle - PI/2, (winIndex+1)*segAngle - PI/2]
    // We want the center of segment winIndex under the pointer (top)
    // Wheel rotates clockwise (positive angle). The pointer is at top.
    // Final angle should place segment winIndex center at top:
    // center of segment = winIndex * segAngle + segAngle/2 (from -PI/2 in draw)
    // We need to rotate by -(winIndex * segAngle + segAngle/2) to bring it to top
    const targetAngle = -(winIndex * segAngle + segAngle / 2);
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = fullSpins * 2 * Math.PI + targetAngle;

    const startTime = performance.now();
    const duration = 4000;
    const startRotation = rotation;

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const currentAngle = startRotation + totalRotation * ease;
      setRotation(currentAngle);
      drawWheel(currentAngle);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const won = SEGMENTS[winIndex];
        setResult(won);
        awardPoints(won);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const awardPoints = async (segment) => {
    if (!user) return;
    try {
      const spinRef = doc(db, 'dailySpins', user.uid);
      const spinDoc = await getDoc(spinRef);
      const data = spinDoc.exists() ? spinDoc.data() : {};
      const extra = data.extraSpins || 0;

      const spinUpdate = {
        lastSpinAt: serverTimestamp(),
        lastResult: segment.points,
        totalSpins: increment(1),
      };
      if (extra > 0) {
        spinUpdate.extraSpins = increment(-1);
        setExtraSpins((prev) => Math.max(0, prev - 1));
      }
      await setDoc(spinRef, spinUpdate, { merge: true });

      if (segment.points > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          'points.lifetime': increment(segment.points),
          'points.weekly': increment(segment.points),
        });
        setUserPoints((prev) => prev + segment.points);
      }

      // Check if more spins available
      const updatedExtra = extra > 0 ? extra - 1 : 0;
      if (updatedExtra > 0) {
        setCanSpin(true);
        setNextSpinTime(null);
      } else {
        setCanSpin(false);
        setNextSpinTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
      }

      trackEvent(user.uid, 'spin_wheel', { points: segment.points });
    } catch (err) {
      console.error('Error awarding spin points:', err);
    }
  };

  const handleBuySpin = async () => {
    if (!user || buyingSpins || userPoints < SPIN_COST) return;
    setBuyingSpins(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentWeekly = userSnap.data()?.points?.weekly || 0;
      const weeklyDeduction = Math.min(SPIN_COST, Math.max(0, currentWeekly));
      const updateFields = { 'points.lifetime': increment(-SPIN_COST) };
      if (weeklyDeduction > 0) {
        updateFields['points.weekly'] = increment(-weeklyDeduction);
      }
      await updateDoc(userRef, updateFields);

      const spinRef = doc(db, 'dailySpins', user.uid);
      await setDoc(spinRef, {
        extraSpins: increment(1),
      }, { merge: true });

      setUserPoints((prev) => prev - SPIN_COST);
      setExtraSpins((prev) => prev + 1);
      setCanSpin(true);
      setNextSpinTime(null);
      trackEvent(user.uid, 'buy_spin', { cost: SPIN_COST });
    } catch (err) {
      console.error('Error buying spin:', err);
    }
    setBuyingSpins(false);
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const formatCountdown = () => {
    if (!nextSpinTime) return '';
    const diff = nextSpinTime.getTime() - Date.now();
    if (diff <= 0) return 'Now!';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-2xl"
        />
      </div>

      {result && (
        <div className={`text-center p-4 rounded-xl ${result.points > 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
          {result.points > 0 ? (
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              You won {result.points} points!
            </p>
          ) : (
            <p className="text-lg font-medium text-red-500 dark:text-red-400">
              Better luck tomorrow!
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSpin}
        disabled={spinning || !canSpin}
        className={`px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg ${
          canSpin && !spinning
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:shadow-xl hover:scale-105'
            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
      >
        {spinning ? 'Spinning...' : canSpin ? `SPIN!${extraSpins > 0 ? ` (${extraSpins} extra)` : ''}` : `Next spin in ${formatCountdown()}`}
      </button>

      {!canSpin && !spinning && (
        <div className="text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 w-full max-w-xs">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Want another spin?</p>
          <button
            onClick={handleBuySpin}
            disabled={buyingSpins || userPoints < SPIN_COST}
            className={`w-full px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
              userPoints >= SPIN_COST && !buyingSpins
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {buyingSpins ? 'Buying...' : `Buy Spin for ${SPIN_COST} pts`}
          </button>
          <p className="text-xs text-gray-400 mt-1.5">Your points: {userPoints.toLocaleString()}</p>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Spin the wheel once every 24 hours for a chance to win points!
      </p>
    </div>
  );
}

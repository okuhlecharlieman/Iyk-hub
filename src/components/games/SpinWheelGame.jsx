'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { trackEvent } from '../../lib/engagement';

const SEGMENTS = [
  { label: '50 pts', points: 50, color: '#f59e0b', weight: 5 },
  { label: '5 pts', points: 5, color: '#3b82f6', weight: 30 },
  { label: '10 pts', points: 10, color: '#10b981', weight: 25 },
  { label: 'Better Luck\nTomorrow', points: 0, color: '#ef4444', weight: 20 },
  { label: '5 pts', points: 5, color: '#8b5cf6', weight: 30 },
  { label: '10 pts', points: 10, color: '#06b6d4', weight: 25 },
  { label: '50 pts', points: 50, color: '#f97316', weight: 5 },
  { label: 'Better Luck\nTomorrow', points: 0, color: '#ec4899', weight: 20 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

function pickSegment() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SEGMENTS.length; i++) {
    rand -= SEGMENTS[i].weight;
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
  const animRef = useRef(null);

  const checkSpinEligibility = useCallback(async () => {
    if (!user) return;
    try {
      const spinRef = doc(db, 'dailySpins', user.uid);
      const spinDoc = await getDoc(spinRef);
      if (!spinDoc.exists()) {
        setCanSpin(true);
        setLoading(false);
        return;
      }
      const data = spinDoc.data();
      const lastSpin = data.lastSpinAt?.toDate();
      if (!lastSpin) {
        setCanSpin(true);
        setLoading(false);
        return;
      }
      const hoursSince = (Date.now() - lastSpin.getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 24) {
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
    const segAngle = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    SEGMENTS.forEach((seg, i) => {
      const start = i * segAngle;
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

    // Pointer
    ctx.beginPath();
    ctx.moveTo(center + radius + 5, center);
    ctx.lineTo(center + radius - 20, center - 10);
    ctx.lineTo(center + radius - 20, center + 10);
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
      await setDoc(spinRef, {
        lastSpinAt: serverTimestamp(),
        lastResult: segment.points,
        totalSpins: increment(1),
      }, { merge: true });

      if (segment.points > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          'points.lifetime': increment(segment.points),
          'points.weekly': increment(segment.points),
        });
      }

      setCanSpin(false);
      setNextSpinTime(new Date(Date.now() + 24 * 60 * 60 * 1000));

      trackEvent(user.uid, 'spin_wheel', { points: segment.points });
    } catch (err) {
      console.error('Error awarding spin points:', err);
    }
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
        {spinning ? 'Spinning...' : canSpin ? 'SPIN!' : `Next spin in ${formatCountdown()}`}
      </button>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Spin the wheel once every 24 hours for a chance to win points!
      </p>
    </div>
  );
}

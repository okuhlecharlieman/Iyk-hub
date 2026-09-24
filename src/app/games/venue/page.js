'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { db } from '../../../lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { FaArrowLeft, FaCopy, FaPlay, FaQrcode, FaTrophy, FaUsers } from 'react-icons/fa';
import Link from 'next/link';

const FALLBACK_QUESTIONS = [
  { question: 'Which city is known as the City of Gold?', options: ['Durban', 'Johannesburg', 'Gqeberha', 'Polokwane'], answer: 'Johannesburg' },
  { question: 'How many players are on the field for one soccer team?', options: ['9', '10', '11', '12'], answer: '11' },
  { question: 'What does Ubuntu most closely describe?', options: ['Community and humanity', 'A dance style', 'A local dish', 'A weather pattern'], answer: 'Community and humanity' },
];

const getQuestions = async () => {
  try {
    const response = await fetch('/api/games/content?type=quiz');
    const data = await response.json();
    if (response.ok && data.items?.length) return data.items.sort(() => Math.random() - 0.5).slice(0, 5);
  } catch {}
  return FALLBACK_QUESTIONS;
};

const createPin = () => String(Math.floor(1000 + Math.random() * 9000));

const playerName = (user) => user?.displayName || user?.email?.split('@')[0] || 'Player';

/** VenueQuizPage — host-driven, PIN-based live quiz for group venues. */
export default function VenueQuizPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState(searchParams.get('room') || '');
  const [room, setRoom] = useState(null);
  const [roomPin, setRoomPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isHost = Boolean(room && user && room.hostUid === user.uid);
  const roomRef = useMemo(() => roomPin ? doc(db, 'venueRooms', roomPin) : null, [roomPin]);
  const players = Object.values(room?.players || {});
  const currentQuestion = room?.questions?.[room?.currentQuestionIndex || 0];
  const currentPlayer = room?.players?.[user?.uid];

  useEffect(() => {
    if (!roomRef) return undefined;
    return onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setError('This venue room no longer exists.');
        setRoom(null);
        return;
      }
      setRoom(snapshot.data());
    }, () => setError('Could not sync the venue room.'));
  }, [roomRef]);

  useEffect(() => {
    if (searchParams.get('room')) setRoomPin(searchParams.get('room'));
  }, [searchParams]);

  const createRoom = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const newPin = createPin();
      const questions = await getQuestions();
      const roomData = {
        hostUid: user.uid,
        hostName: playerName(user),
        status: 'lobby',
        currentQuestionIndex: 0,
        questions,
        players: { [user.uid]: { uid: user.uid, name: playerName(user), score: 0, answer: null } },
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'venueRooms', newPin), roomData);
      setRoomPin(newPin);
      setRoom(roomData);
      router.replace(`/games/venue?room=${newPin}`);
    } catch (err) {
      setError(err.message || 'Could not create the venue room.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    const normalizedPin = pin.trim();
    if (!user || !/^\d{4}$/.test(normalizedPin)) {
      setError('Enter a valid four-digit room PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ref = doc(db, 'venueRooms', normalizedPin);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) throw new Error('Room not found. Check the PIN with the host.');
      const data = snapshot.data();
      if (data.status !== 'lobby') throw new Error('This room has already started.');
      await updateDoc(ref, { [`players.${user.uid}`]: { uid: user.uid, name: playerName(user), score: 0, answer: null } });
      setRoomPin(normalizedPin);
      setRoom(data);
      router.replace(`/games/venue?room=${normalizedPin}`);
    } catch (err) {
      setError(err.message || 'Could not join the venue room.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/games/venue?room=${roomPin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRound = async () => {
    if (isHost && roomRef) await updateDoc(roomRef, { status: 'live', currentQuestionIndex: 0 });
  };

  const revealAnswer = async () => {
    if (isHost && roomRef && room?.status === 'live') await updateDoc(roomRef, { status: 'reveal' });
  };

  const nextQuestion = async () => {
    if (!isHost || !roomRef || !currentQuestion) return;
    const nextPlayers = { ...room.players };
    Object.values(nextPlayers).forEach((player) => {
      nextPlayers[player.uid] = {
        ...player,
        score: player.score + (player.answer === currentQuestion.answer ? 1 : 0),
        answer: null,
      };
    });
    const nextIndex = room.currentQuestionIndex + 1;
    await updateDoc(roomRef, nextIndex >= room.questions.length
      ? { players: nextPlayers, status: 'finished' }
      : { players: nextPlayers, currentQuestionIndex: nextIndex, status: 'live' });
  };

  const submitAnswer = async (answer) => {
    if (!roomRef || !user || room?.status !== 'live' || currentPlayer?.answer) return;
    await updateDoc(roomRef, { [`players.${user.uid}.answer`]: answer });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><FaArrowLeft /> Back to Games</Link>
          {!room ? (
            <div className="mx-auto mt-10 max-w-3xl">
              <div className="mb-8 text-center">
                <FaUsers className="mx-auto mb-4 text-emerald-300 text-4xl" />
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 font-semibold">Venue mode</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Live Quiz Night</h1>
                <p className="mx-auto mt-4 max-w-xl text-slate-300">One screen hosts the questions. Everyone else joins from their phone with a four-digit PIN.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
                  <FaPlay className="mb-4 text-emerald-300" />
                  <h2 className="text-xl font-bold">Host a room</h2>
                  <p className="mt-2 text-sm text-slate-300">Create a live quiz for your venue, table, or community event.</p>
                  <button onClick={createRoom} disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50">{loading ? 'Creating...' : 'Create host room'}</button>
                </section>
                <section className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-6">
                  <FaQrcode className="mb-4 text-blue-300" />
                  <h2 className="text-xl font-bold">Join a room</h2>
                  <p className="mt-2 text-sm text-slate-300">Enter the PIN shown on the venue screen.</p>
                  <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="0000" className="mt-6 w-full rounded-xl border border-white/20 bg-slate-900 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-white outline-none focus:border-blue-300" />
                  <button onClick={joinRoom} disabled={loading || pin.length !== 4} className="mt-3 w-full rounded-xl bg-blue-400 px-4 py-3 font-bold text-slate-950 hover:bg-blue-300 disabled:opacity-50">Join game</button>
                </section>
              </div>
              {error && <p className="mt-5 rounded-xl bg-red-400/10 p-3 text-center text-sm text-red-200">{error}</p>}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
              <main className="rounded-2xl bg-white p-6 text-slate-900 shadow-2xl sm:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Live Quiz Night</p><h1 className="mt-1 text-3xl font-black">Room {roomPin}</h1></div>
                  <button onClick={copyInvite} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><FaCopy /> {copied ? 'Copied' : 'Copy invite'}</button>
                </div>
                {room.status === 'lobby' && <div className="py-16 text-center"><p className="text-6xl font-black tracking-[0.25em] text-emerald-600">{roomPin}</p><p className="mt-4 text-slate-500">Players can join with this PIN.</p>{isHost && <button onClick={startRound} className="mt-8 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-700">Start quiz</button>}</div>}
                {room.status === 'live' && currentQuestion && <div className="py-8"><div className="flex items-center justify-between text-sm text-slate-500"><span>Question {(room.currentQuestionIndex || 0) + 1} of {room.questions.length}</span><span>{players.filter((player) => player.answer).length}/{players.length} answered</span></div><h2 className="mt-8 text-2xl font-black sm:text-3xl">{currentQuestion.question}</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{currentQuestion.options.map((option) => <button key={option} onClick={() => submitAnswer(option)} disabled={Boolean(currentPlayer?.answer) || isHost} className={`rounded-xl border-2 px-4 py-4 text-left font-semibold transition-colors ${currentPlayer?.answer === option ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400'} disabled:cursor-default`}>{option}</button>)}</div>{isHost && <button onClick={revealAnswer} className="mt-8 rounded-xl bg-amber-500 px-5 py-3 font-bold text-white">Reveal answer</button>}</div>}
                {room.status === 'reveal' && currentQuestion && <div className="py-14 text-center"><FaTrophy className="mx-auto text-5xl text-amber-500" /><p className="mt-5 text-sm font-bold uppercase tracking-widest text-slate-500">Correct answer</p><h2 className="mt-2 text-3xl font-black text-emerald-600">{currentQuestion.answer}</h2>{isHost && <button onClick={nextQuestion} className="mt-8 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">{room.currentQuestionIndex + 1 >= room.questions.length ? 'Show leaderboard' : 'Next question'}</button>}</div>}
                {room.status === 'finished' && <div className="py-10 text-center"><FaTrophy className="mx-auto text-5xl text-amber-500" /><h2 className="mt-4 text-3xl font-black">Final leaderboard</h2><div className="mx-auto mt-6 max-w-md space-y-2 text-left">{players.sort((a, b) => b.score - a.score).map((player, index) => <div key={player.uid} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3"><span className="font-semibold">{index + 1}. {player.name}</span><strong>{player.score} pts</strong></div>)}</div></div>}
              </main>
              <aside className="rounded-2xl border border-white/10 bg-white/10 p-5"><h2 className="flex items-center gap-2 font-bold"><FaUsers className="text-emerald-300" /> Players ({players.length})</h2><div className="mt-4 space-y-2">{players.map((player) => <div key={player.uid} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-sm"><span>{player.name}{player.uid === room.hostUid ? ' (host)' : ''}</span><span className="text-emerald-300">{player.score}</span></div>)}</div><p className="mt-6 text-xs leading-5 text-slate-300">Share the room PIN or invite link on the venue screen. Players join free; venue host access can later be tied to a subscription or event pass.</p></aside>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

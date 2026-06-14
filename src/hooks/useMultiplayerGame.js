'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export default function useMultiplayerGame(gameId, { createInitialState, playerDataFactory, onSnapshot: onSnapshotCb }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const lastResultKeyRef = useRef(null);
  const gameDocRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  useEffect(() => {
    if (!user) {
      setError('You must be logged in to play.');
      setLoading(false);
      return;
    }

    const joinGame = async () => {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          const initialState = await createInitialState(user);
          await setDoc(gameDocRef, initialState);
          setPlayerSymbol('player1');
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            const player2Data = playerDataFactory
              ? playerDataFactory(user)
              : { uid: user.uid, displayName: user.displayName, score: 0 };
            await updateDoc(gameDocRef, {
              'players.player2': player2Data,
              status: 'playing',
            });
            setPlayerSymbol('player2');
          } else if (data.players.player1?.uid === user.uid) {
            setPlayerSymbol('player1');
          } else if (data.players.player2?.uid === user.uid) {
            setPlayerSymbol('player2');
          } else {
            setError('This game room is full. Please create a new game.');
            setLoading(false);
            return;
          }
        }
      } catch {
        setError('Failed to join game. The room may no longer exist.');
        setLoading(false);
      }
    };

    joinGame();
  }, [gameId, user, gameDocRef, createInitialState, playerDataFactory]);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        setLoading(false);
        if (onSnapshotCb) onSnapshotCb(data);
      }
    }, (e) => {
      setError('Game sync error: ' + e.message);
    });
    return () => unsubscribe();
  }, [gameDocRef, onSnapshotCb]);

  return { gameState, playerSymbol, error, loading, lastResultKeyRef, gameDocRef, user };
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const createInitialState = () => ({
  board: Array(9).fill(''),
  currentPlayer: 'X',
  winner: '',
  players: { X: { displayName: 'You' }, O: { displayName: 'CPU' } },
});

const calculateWinner = (board) => {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return 'draw';
  return '';
};

const pickComputerMove = (board) => {
  const open = board
    .map((v, i) => (v ? null : i))
    .filter((v) => v !== null);
  if (!open.length) return null;
  return open[Math.floor(Math.random() * open.length)];
};

export default function XOGame({ gameId, onEnd, mode = 'multiplayer' }) {
  const { user } = useAuth();
  const isSinglePlayer = mode === 'single';

  const [gameState, setGameState] = useState(createInitialState());
  const [playerSymbol, setPlayerSymbol] = useState('X');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!isSinglePlayer);
  const [onEndCalled, setOnEndCalled] = useState(false);

  const gameDocRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  useEffect(() => {
    if (isSinglePlayer) {
      setLoading(false);
      return;
    }

    if (!user) {
      setError('You must be logged in to play.');
      setLoading(false);
      return;
    }

    async function joinGame() {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            board: Array(9).fill(''),
            currentPlayer: 'X',
            winner: '',
            players: { X: { uid: user.uid, displayName: user.displayName || 'Player X' }, O: null },
          });
          setPlayerSymbol('X');
        } else {
          const data = snap.data();
          if (!data.players.O && data.players.X?.uid !== user.uid) {
            await updateDoc(gameDocRef, { 'players.O': { uid: user.uid, displayName: user.displayName || 'Player O' } });
            setPlayerSymbol('O');
          } else if (data.players.X?.uid === user.uid) {
            setPlayerSymbol('X');
          } else if (data.players.O?.uid === user.uid) {
            setPlayerSymbol('O');
          }
        }
      } catch (e) {
        setError(`Failed to join game: ${e.message}`);
        setLoading(false);
      }
    }

    joinGame();
  }, [gameDocRef, isSinglePlayer, user]);

  useEffect(() => {
    if (isSinglePlayer) return;
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameState(snapshot.data());
      }
      setLoading(false);
    }, (e) => {
      setError(`Game sync error: ${e.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameDocRef, isSinglePlayer]);

  useEffect(() => {
    if (!gameState?.winner) {
      setOnEndCalled(false);
      return;
    }

    if (!onEnd || onEndCalled) return;

    let finalScore = 0;
    if (gameState.winner === 'draw') finalScore = 5;
    else if (gameState.winner === playerSymbol) finalScore = isSinglePlayer ? 8 : 12;
    else finalScore = 2;

    onEnd({ score: finalScore });
    setOnEndCalled(true);
  }, [gameState, onEnd, onEndCalled, playerSymbol, isSinglePlayer]);

  useEffect(() => {
    if (!isSinglePlayer) return;
    if (gameState.winner || gameState.currentPlayer !== 'O') return;

    const timer = setTimeout(() => {
      const move = pickComputerMove(gameState.board);
      if (move === null) return;
      const nextBoard = [...gameState.board];
      nextBoard[move] = 'O';
      const winner = calculateWinner(nextBoard);
      setGameState((prev) => ({
        ...prev,
        board: nextBoard,
        currentPlayer: winner ? '' : 'X',
        winner,
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [gameState, isSinglePlayer]);

  const handleClick = async (idx) => {
    if (gameState.board[idx] || gameState.winner) return;

    if (isSinglePlayer) {
      if (gameState.currentPlayer !== 'X') return;
      const nextBoard = [...gameState.board];
      nextBoard[idx] = 'X';
      const winner = calculateWinner(nextBoard);
      setGameState((prev) => ({
        ...prev,
        board: nextBoard,
        currentPlayer: winner ? '' : 'O',
        winner,
      }));
      return;
    }

    if (gameState.currentPlayer !== playerSymbol || !['X', 'O'].includes(playerSymbol)) return;

    const nextBoard = [...gameState.board];
    nextBoard[idx] = playerSymbol;
    const winner = calculateWinner(nextBoard);
    const nextPlayer = playerSymbol === 'X' ? 'O' : 'X';

    try {
      await updateDoc(gameDocRef, {
        board: nextBoard,
        currentPlayer: winner ? '' : nextPlayer,
        winner,
      });
    } catch (e) {
      setError(`Move failed: ${e.message}`);
    }
  };

  const handleReset = async () => {
    if (isSinglePlayer) {
      setGameState(createInitialState());
      return;
    }
    try {
      await updateDoc(gameDocRef, {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        winner: '',
      });
    } catch (e) {
      setError(`Reset failed: ${e.message}`);
    }
  };

  if (loading) return <p>Loading game...</p>;
  if (error) return <div className="text-red-600">{error}</div>;

  const { board, currentPlayer, winner, players } = gameState;
  const statusMessage = winner
    ? `Game over: ${winner === 'draw' ? 'Draw' : `${winner} wins`}`
    : isSinglePlayer
      ? `Turn: ${currentPlayer === 'X' ? 'You' : 'CPU'}`
      : (!players?.X || !players?.O)
        ? 'Waiting for opponent...'
        : `Turn: ${currentPlayer}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Mode: {isSinglePlayer ? 'Single Player' : 'Multiplayer'}</p>
        <p className="text-sm font-semibold">{statusMessage}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md text-center mb-2">
        <p>X: {players?.X?.displayName || '...'}</p>
        <p>O: {players?.O?.displayName || (isSinglePlayer ? 'CPU' : '...')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 w-[252px]">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className="h-20 w-20 rounded-xl border border-gray-300 dark:border-gray-600 text-3xl font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={!!winner || (!isSinglePlayer && currentPlayer !== playerSymbol)}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <button onClick={handleReset} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700">
          Play Again
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const choices = [
  { id: 'rock', icon: <FaHandRock size={40} /> },
  { id: 'paper', icon: <FaHandPaper size={40} /> },
  { id: 'scissors', icon: <FaHandScissors size={40} /> },
];

const decideResult = (p1c, p2c) => {
  if (p1c === p2c) return 0;
  if (
    (p1c === 'rock' && p2c === 'scissors') ||
    (p1c === 'paper' && p2c === 'rock') ||
    (p1c === 'scissors' && p2c === 'paper')
  ) return 1;
  return 2;
};

const randomChoice = () => choices[Math.floor(Math.random() * choices.length)].id;

export default function RPSGame({ gameId, onEnd, mode = 'multiplayer' }) {
  const { user } = useAuth();
  const router = useRouter();
  const isSinglePlayer = mode === 'single';
  const gameDocRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!isSinglePlayer);

  useEffect(() => {
    if (isSinglePlayer) {
      setGameState({
        players: {
          player1: { uid: user?.uid || 'local', displayName: user?.displayName || 'You', choice: null, score: 0 },
          player2: { uid: 'cpu', displayName: 'CPU', choice: null, score: 0 },
        },
        status: 'playing',
        result: '',
      });
      setPlayerSymbol('player1');
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
            players: {
              player1: { uid: user.uid, displayName: user.displayName || 'Player 1', choice: null, score: 0 },
              player2: null,
            },
            status: 'waiting',
            result: '',
          });
          setPlayerSymbol('player1');
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            await updateDoc(gameDocRef, {
              'players.player2': { uid: user.uid, displayName: user.displayName || 'Player 2', choice: null, score: 0 },
              status: 'playing',
            });
            setPlayerSymbol('player2');
          } else if (data.players.player1?.uid === user.uid) {
            setPlayerSymbol('player1');
          } else if (data.players.player2?.uid === user.uid) {
            setPlayerSymbol('player2');
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

    const unsubscribe = onSnapshot(gameDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setGameState(data);
      setLoading(false);

      if (data.status === 'playing' && data.players.player1?.choice && data.players.player2?.choice) {
        const outcome = decideResult(data.players.player1.choice, data.players.player2.choice);
        let p1Score = data.players.player1.score;
        let p2Score = data.players.player2.score;
        let resultText = "It's a tie!";

        if (outcome === 1) {
          p1Score += 1;
          resultText = `${data.players.player1.displayName} wins this round!`;
        } else if (outcome === 2) {
          p2Score += 1;
          resultText = `${data.players.player2.displayName} wins this round!`;
        }

        await updateDoc(gameDocRef, {
          status: 'result',
          result: resultText,
          'players.player1.score': p1Score,
          'players.player2.score': p2Score,
        });
      }
    }, (e) => {
      setError(`Game sync error: ${e.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameDocRef, isSinglePlayer]);

  const handleUserChoice = async (choiceId) => {
    if (!gameState || !playerSymbol || gameState.status !== 'playing') return;

    if (isSinglePlayer) {
      const cpu = randomChoice();
      const outcome = decideResult(choiceId, cpu);
      let p1Score = gameState.players.player1.score;
      let p2Score = gameState.players.player2.score;
      let resultText = `You chose ${choiceId}, CPU chose ${cpu}. It's a tie!`;

      if (outcome === 1) {
        p1Score += 1;
        resultText = `You chose ${choiceId}, CPU chose ${cpu}. You win this round!`;
      } else if (outcome === 2) {
        p2Score += 1;
        resultText = `You chose ${choiceId}, CPU chose ${cpu}. CPU wins this round.`;
      }

      setGameState((prev) => ({
        ...prev,
        status: 'result',
        result: resultText,
        players: {
          player1: { ...prev.players.player1, choice: choiceId, score: p1Score },
          player2: { ...prev.players.player2, choice: cpu, score: p2Score },
        },
      }));
      return;
    }

    const playerChoicePath = `players.${playerSymbol}.choice`;
    if (gameState.players[playerSymbol].choice) return;

    try {
      await updateDoc(gameDocRef, { [playerChoicePath]: choiceId });
    } catch (e) {
      setError(`Failed to make choice: ${e.message}`);
    }
  };

  const handleNextRound = async () => {
    if (!gameState || gameState.status !== 'result') return;

    if (isSinglePlayer) {
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        result: '',
        players: {
          player1: { ...prev.players.player1, choice: null },
          player2: { ...prev.players.player2, choice: null },
        },
      }));
      return;
    }

    try {
      await updateDoc(gameDocRef, {
        'players.player1.choice': null,
        'players.player2.choice': null,
        status: 'playing',
        result: '',
      });
    } catch (e) {
      setError(`Failed to start next round: ${e.message}`);
    }
  };

  const handleEndGame = () => {
    if (onEnd && playerSymbol && gameState?.players?.[playerSymbol]) {
      const base = gameState.players[playerSymbol].score;
      const boosted = isSinglePlayer ? base * 2 : base * 3;
      onEnd(boosted);
    }
    router.push('/games');
  };

  if (loading) return <div>Loading game...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!gameState) return <p className="text-red-500">Game not found or failed to load.</p>;

  const { players, status, result } = gameState;
  const you = players[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players.player2 : players.player1;

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Rock, Paper, Scissors</h2>
      <p className="mb-2 text-sm text-gray-500">Mode: {isSinglePlayer ? 'Single Player' : 'Multiplayer'}</p>

      <div className="grid grid-cols-2 gap-8 w-full max-w-md text-center">
        <div>
          <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
          <p>Score: {you?.score || 0}</p>
        </div>
        <div>
          <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
          <p>Score: {opponent?.score || 0}</p>
        </div>
      </div>

      {status === 'waiting' && <p className="mt-4">Waiting for another player to join...</p>}

      {status === 'playing' && (
        <div className="mt-8 text-center">
          <p className="mb-4">Choose your move</p>
          <div className="flex justify-center gap-4 mb-5">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleUserChoice(choice.id)}
                disabled={!!you?.choice}
                className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                {choice.icon}
              </button>
            ))}
          </div>
          {you?.choice && !opponent?.choice && !isSinglePlayer && <p>Waiting for opponent...</p>}
        </div>
      )}

      {status === 'result' && (
        <div className="text-center mt-6">
          <p className="text-sm">Your choice: {you?.choice}</p>
          <p className="text-sm">{opponent?.displayName}'s choice: {opponent?.choice}</p>
          <p className="text-xl font-bold mt-3">{result}</p>
          <button onClick={handleNextRound} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Next Round</button>
        </div>
      )}

      <button onClick={handleEndGame} className="mt-8 bg-red-500 text-white px-4 py-2 rounded">
        End Game
      </button>
    </div>
  );
}

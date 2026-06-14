'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const choices = [
  { id: 'rock', icon: <FaHandRock size={40} /> },
  { id: 'paper', icon: <FaHandPaper size={40} /> },
  { id: 'scissors', icon: <FaHandScissors size={40} /> },
];

function RPSSinglePlayer({ onEnd }) {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [roundResult, setRoundResult] = useState('');
  const hasEnded = useRef(false);

  const resolveSingleRound = (choiceId) => {
    const opponent = choices[Math.floor(Math.random() * choices.length)].id;
    setPlayerChoice(choiceId);
    setOpponentChoice(opponent);

    if (choiceId === opponent) {
      setRoundResult("It's a tie!");
      return 1;
    }

    const win =
      (choiceId === 'rock' && opponent === 'scissors') ||
      (choiceId === 'paper' && opponent === 'rock') ||
      (choiceId === 'scissors' && opponent === 'paper');

    if (win) {
      setRoundResult('You win!');
      setPlayerScore((prev) => prev + 5);
      return 5;
    }

    setRoundResult('You lose.');
    return 0;
  };

  const handleChoice = (choiceId) => {
    if (!user) {
      setError('You must be logged in to play.');
      return;
    }
    resolveSingleRound(choiceId);
  };

  const handleEndGame = () => {
    if (onEnd && !hasEnded.current) {
      hasEnded.current = true;
      onEnd(playerScore);
    }
    router.push('/games');
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Rock, Paper, Scissors — Single Player</h2>
      <p className="mb-4 text-lg">Score: <span className="font-bold text-blue-500">{playerScore}</span></p>

      <div className="flex justify-center gap-6 mb-8">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoice(choice.id)}
            className="p-5 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-110 transition-all duration-200 shadow-md"
          >
            {choice.icon}
          </button>
        ))}
      </div>

      <div className="text-center mb-6 min-h-[80px]">
        {playerChoice && opponentChoice && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
            <p className="text-gray-600 dark:text-gray-400">Your choice: <span className="font-semibold capitalize">{playerChoice}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Computer&apos;s choice: <span className="font-semibold capitalize">{opponentChoice}</span></p>
            <p className="font-bold text-lg mt-2">{roundResult}</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <button onClick={handleEndGame} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
        End Game
      </button>
    </div>
  );
}

function RPSMultiplayer({ gameId, onEnd }) {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasEnded = useRef(false);
  const gameDocRef = useMemo(() => doc(db, 'games', gameId), [gameId]);

  useEffect(() => {
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
              player1: { uid: user.uid, displayName: user.displayName, choice: null, score: 0 },
              player2: null
            },
            status: 'waiting',
            result: ''
          });
          setPlayerSymbol('player1');
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            await updateDoc(gameDocRef, {
              'players.player2': { uid: user.uid, displayName: user.displayName, choice: null, score: 0 },
              status: 'playing'
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
      } catch (e) {
        setError('Failed to join game. The room may no longer exist.');
        setLoading(false);
      }
    }
    joinGame();
  }, [gameId, user, gameDocRef]);

  const resolveRound = useCallback(async () => {
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(gameDocRef);
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        if (data.status !== 'playing' || !data.players.player1?.choice || !data.players.player2?.choice) return;

        const p1c = data.players.player1.choice;
        const p2c = data.players.player2.choice;
        let resultText = '';
        let p1Score = data.players.player1.score;
        let p2Score = data.players.player2.score;

        if (p1c === p2c) {
          resultText = "It's a tie!";
        } else if (
          (p1c === 'rock' && p2c === 'scissors') ||
          (p1c === 'paper' && p2c === 'rock') ||
          (p1c === 'scissors' && p2c === 'paper')
        ) {
          resultText = `${data.players.player1.displayName} wins!`;
          p1Score += 1;
        } else {
          resultText = `${data.players.player2.displayName} wins!`;
          p2Score += 1;
        }

        transaction.update(gameDocRef, {
          status: 'result',
          result: resultText,
          'players.player1.score': p1Score,
          'players.player2.score': p2Score,
        });
      });
    } catch (e) {
      setError('Failed to resolve round: ' + e.message);
    }
  }, [gameDocRef]);

  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        setLoading(false);

        if (
          data.status === 'playing' &&
          data.players.player1?.choice &&
          data.players.player2?.choice
        ) {
          resolveRound();
        }
      }
    }, (e) => {
      setError('Game sync error: ' + e.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameId, gameDocRef, resolveRound]);

  const handleUserChoice = async (choiceId) => {
    if (!playerSymbol || !gameState || gameState.status !== 'playing') return;

    const playerChoicePath = `players.${playerSymbol}.choice`;
    if (gameState.players[playerSymbol].choice) return;

    try {
      await updateDoc(gameDocRef, {
        [playerChoicePath]: choiceId
      });
    } catch (e) {
      setError('Failed to make choice: ' + e.message);
    }
  };

  const handleNextRound = async () => {
    if (gameState.status !== 'result') return;
    try {
      await updateDoc(gameDocRef, {
        'players.player1.choice': null,
        'players.player2.choice': null,
        status: 'playing',
        result: ''
      });
    } catch (e) {
      setError('Failed to start next round: ' + e.message);
    }
  };

  const handleEndGame = () => {
    if (onEnd && !hasEnded.current) {
      hasEnded.current = true;
      const playerScore = gameState.players[playerSymbol].score;
      onEnd(playerScore);
    }
    router.push('/games');
  };

  if (loading) return <div className="text-center py-8">Loading game...</div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;
  if (!gameState) return <p className="text-red-500 text-center py-8">Game not found or failed to load.</p>;

  const { players, status, result } = gameState;
  const you = players[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players.player2 : players.player1;

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Rock, Paper, Scissors</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Room: <span className="font-mono">{gameId}</span></p>

      <div className="grid grid-cols-2 gap-8 w-full max-w-md text-center mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
          <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
          <p className="text-2xl font-bold text-blue-500">{you?.score || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
          <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
          <p className="text-2xl font-bold text-red-500">{opponent?.score || 0}</p>
        </div>
      </div>

      {status === 'waiting' && (
        <p className="mt-4 text-gray-500 dark:text-gray-400">Waiting for another player to join...</p>
      )}

      {status === 'playing' && (
        <div className="mt-4 text-center">
          <p className="mb-4 text-lg font-medium">Choose your weapon!</p>
          <div className="flex justify-center gap-6 mb-8">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleUserChoice(choice.id)}
                disabled={!!you?.choice}
                className="p-5 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-110 transition-all duration-200 shadow-md disabled:opacity-50 disabled:hover:scale-100"
              >
                {choice.icon}
              </button>
            ))}
          </div>
          {you?.choice && !opponent?.choice && <p className="text-gray-500">Waiting for opponent to choose...</p>}
          {you?.choice && opponent?.choice && <p className="text-gray-500">Both players have chosen. Calculating result...</p>}
        </div>
      )}

      {status === 'result' && (
        <div className="text-center mt-4 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md max-w-md w-full">
          <p className="text-gray-600 dark:text-gray-400">Your choice: <span className="font-semibold capitalize">{you.choice}</span></p>
          <p className="text-gray-600 dark:text-gray-400">{opponent.displayName}&apos;s choice: <span className="font-semibold capitalize">{opponent.choice}</span></p>
          <p className="text-xl font-bold mt-3">{result}</p>
          <button onClick={handleNextRound} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">Next Round</button>
        </div>
      )}

      <div className="mt-8">
        <button onClick={handleEndGame} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">End Game</button>
      </div>
    </div>
  );
}

export default function RPSGame({ gameId, onEnd, singlePlayer = false }) {
  if (singlePlayer) {
    return <RPSSinglePlayer onEnd={onEnd} />;
  }
  return <RPSMultiplayer gameId={gameId} onEnd={onEnd} />;
}

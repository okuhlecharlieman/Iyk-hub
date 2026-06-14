/**
 * HangmanGame — single-player and multiplayer hangman.
 * Words are fetched from /api/games/content?type=hangman (Firestore-backed).
 * Falls back to built-in defaults if the API is unavailable.
 */
'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const FALLBACK_WORDS = [
  { word: 'react', hint: 'A JavaScript UI library' },
  { word: 'nextjs', hint: 'React framework' },
  { word: 'firebase', hint: 'Google cloud platform' },
  { word: 'tailwind', hint: 'CSS framework' },
  { word: 'javascript', hint: 'Language of the web' },
];

/** Fetch hangman words from the game content API, falling back to hardcoded. */
async function fetchHangmanWords() {
  try {
    const res = await fetch('/api/games/content?type=hangman');
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) return data.items;
    }
  } catch { /* silent */ }
  return FALLBACK_WORDS;
}

const pickRandomWord = (words) => {
  const item = words[Math.floor(Math.random() * words.length)];
  return typeof item === 'string' ? item : item.word;
};

const HANGMAN_PARTS = [
  { part: 'head', draw: '  O' },
  { part: 'body', draw: '  |' },
  { part: 'leftArm', draw: ' /|' },
  { part: 'rightArm', draw: ' /|\\' },
  { part: 'leftLeg', draw: ' /' },
  { part: 'bothLegs', draw: ' / \\' },
];

function HangmanDrawing({ wrongGuesses }) {
  const count = Math.min(wrongGuesses, 6);
  return (
    <div className="font-mono text-2xl leading-tight text-gray-800 dark:text-gray-200 mb-4 min-h-[120px] flex flex-col items-center">
      <div>{' ____'}</div>
      <div>{' |  |'}</div>
      <div>{count >= 1 ? ' |  O' : ' |'}</div>
      <div>{count >= 4 ? ' | /|\\' : count >= 3 ? ' | /|' : count >= 2 ? ' |  |' : ' |'}</div>
      <div>{count >= 6 ? ' | / \\' : count >= 5 ? ' | /' : ' |'}</div>
      <div>{' |____'}</div>
    </div>
  );
}

function HangmanSinglePlayer({ onEnd }) {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const onEndCalledRef = useRef(false);
  const allWordsRef = useRef([]);

  // Fetch words from API on mount
  useEffect(() => {
    fetchHangmanWords().then((words) => {
      allWordsRef.current = words;
      setWord(pickRandomWord(words));
      setLoading(false);
    });
  }, []);

  const wrongGuesses = guessedLetters.filter(l => !word.includes(l)).length;
  const wordGuessed = word.length > 0 && word.split('').every(l => guessedLetters.includes(l));
  const lost = word.length > 0 && wrongGuesses >= 6;
  const wordDisplay = word.split('').map(l => guessedLetters.includes(l) ? l : '_').join(' ');

  useEffect(() => {
    if (!word || loading) return;
    if ((wordGuessed || lost) && !onEndCalledRef.current) {
      onEndCalledRef.current = true;
      setGameOver(true);
      const score = wordGuessed ? Math.max(1, 10 - wrongGuesses) : 1;
      if (onEnd) onEnd({ score, resultKey: `hangman-sp:${Date.now()}:${wordGuessed ? 'win' : 'loss'}` });
    }
  }, [word, loading, wordGuessed, lost, wrongGuesses, onEnd]);

  const handleGuess = (letter) => {
    if (guessedLetters.includes(letter) || gameOver) return;
    setGuessedLetters(prev => [...prev, letter]);
  };

  const reset = () => {
    onEndCalledRef.current = false;
    setGuessedLetters([]);
    setGameOver(false);
    setWord(pickRandomWord(allWordsRef.current));
  };

  if (loading) return <p className="text-center py-8">Loading words...</p>;
  if (!word) return <p className="text-center py-8 text-red-500">Could not load words.</p>;

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Hangman</h1>

      <div className="flex justify-center gap-6 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-md">
          <span className="text-sm text-gray-500 dark:text-gray-400">Wrong Guesses</span>
          <p className="text-2xl font-bold text-red-500">{wrongGuesses} / 6</p>
        </div>
      </div>

      <HangmanDrawing wrongGuesses={wrongGuesses} />

      <p className="text-4xl tracking-[0.3em] mb-6 font-mono font-bold">{wordDisplay}</p>

      {!gameOver && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
          {'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={guessedLetters.includes(letter)}
              className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                guessedLetters.includes(letter)
                  ? word.includes(letter)
                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 opacity-60'
                    : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 hover:scale-110'
              } disabled:cursor-not-allowed`}
            >
              {letter.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {gameOver && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md max-w-md mx-auto">
          <p className="text-2xl font-bold mb-2">{wordGuessed ? 'You won!' : 'Game Over!'}</p>
          <p className="text-lg mb-4">The word was: <span className="font-bold text-blue-500">{word}</span></p>
          <button onClick={reset} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

function HangmanMultiplayer({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const lastResultKeyRef = useRef(null);
  const gameEndedRef = useRef(false);
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
          const allW = await fetchHangmanWords();
          await setDoc(gameDocRef, {
            word: pickRandomWord(allW),
            guessedLetters: [],
            players: {
              player1: { uid: user.uid, displayName: user.displayName, wrongGuesses: 0 },
              player2: null,
            },
            currentPlayer: 'player1',
            status: 'waiting',
            winner: null,
          });
          setPlayerSymbol('player1');
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            await updateDoc(gameDocRef, {
              'players.player2': { uid: user.uid, displayName: user.displayName, wrongGuesses: 0 },
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
      } catch (e) {
        setError('Failed to join game. The room may no longer exist.');
        setLoading(false);
      }
    };

    joinGame();
  }, [gameId, user, gameDocRef]);

  const checkAndEndGame = useCallback(async (data) => {
    if (data.status !== 'playing' || gameEndedRef.current) return;
    if (!playerSymbol || !data.players.player2) return;

    const { word, guessedLetters, players } = data;
    const wordGuessed = word.split('').every(letter => guessedLetters.includes(letter));
    const maxWrongGuesses = 6;

    if (wordGuessed) {
      gameEndedRef.current = true;
      const winnerSymbol = data.currentPlayer;
      const winnerName = players[winnerSymbol].displayName;
      try {
        await updateDoc(gameDocRef, { status: 'result', winner: winnerName });
      } catch {}
      const resultKey = `hangman:${gameId}:win:${winnerName}:${word}`;
      if (onEnd && lastResultKeyRef.current !== resultKey) {
        lastResultKeyRef.current = resultKey;
        const isWinner = playerSymbol === winnerSymbol;
        onEnd({ score: isWinner ? 10 : 2, resultKey });
      }
      return;
    }

    if (players.player1.wrongGuesses >= maxWrongGuesses || players.player2.wrongGuesses >= maxWrongGuesses) {
      gameEndedRef.current = true;
      const loserSymbol = players.player1.wrongGuesses >= maxWrongGuesses ? 'player1' : 'player2';
      const winnerSymbol = loserSymbol === 'player1' ? 'player2' : 'player1';
      const winnerName = players[winnerSymbol].displayName;
      const loserName = players[loserSymbol].displayName;
      try {
        await updateDoc(gameDocRef, { status: 'result', winner: winnerName, loser: loserName });
      } catch {}
      const resultKey = `hangman:${gameId}:loss:${winnerName}:${loserName}:${word}`;
      if (onEnd && lastResultKeyRef.current !== resultKey) {
        lastResultKeyRef.current = resultKey;
        const isWinner = playerSymbol === winnerSymbol;
        onEnd({ score: isWinner ? 10 : 2, resultKey });
      }
    }
  }, [gameDocRef, gameId, onEnd, playerSymbol]);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        setLoading(false);
        if (data.status === 'playing') {
          checkAndEndGame(data);
        }
        if (data.status === 'waiting' || data.status === 'playing') {
          gameEndedRef.current = false;
        }
      }
    }, (e) => {
      setError('Game sync error: ' + e.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameDocRef, checkAndEndGame]);

  const handleGuess = async (letter) => {
    if (!gameState || gameState.currentPlayer !== playerSymbol || gameState.guessedLetters.includes(letter) || gameState.status !== 'playing') return;

    const { word, guessedLetters, players, currentPlayer } = gameState;
    const newGuessedLetters = [...guessedLetters, letter];
    let nextPlayer = currentPlayer;
    const newPlayers = {
      player1: { ...players.player1 },
      player2: { ...players.player2 },
    };

    if (!word.includes(letter)) {
      newPlayers[currentPlayer].wrongGuesses += 1;
      nextPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
    }

    await updateDoc(gameDocRef, {
      guessedLetters: newGuessedLetters,
      players: newPlayers,
      currentPlayer: nextPlayer,
    });
  };

  const handleResetGame = async () => {
    gameEndedRef.current = false;
    const allW = await fetchHangmanWords();
    await updateDoc(gameDocRef, {
      word: pickRandomWord(allW),
      guessedLetters: [],
      players: {
        ...gameState.players,
        player1: { ...gameState.players.player1, wrongGuesses: 0 },
        player2: gameState.players.player2 ? { ...gameState.players.player2, wrongGuesses: 0 } : null,
      },
      currentPlayer: 'player1',
      status: gameState.players.player2 ? 'playing' : 'waiting',
      winner: null,
      loser: null
    });
  };

  if (loading) return <p className="text-center py-8">Loading game...</p>;
  if (error) return <p className="text-red-500 text-center py-8">{error}</p>;
  if (!gameState) return <p className="text-red-500 text-center py-8">Game not found or failed to load.</p>;

  const { word, guessedLetters, players, status, currentPlayer, winner, loser } = gameState;
  const you = players?.[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players?.player2 : players?.player1;
  const wordWithGuesses = word.split('').map(letter => (guessedLetters.includes(letter) ? letter : '_')).join(' ');
  const yourWrongGuesses = you?.wrongGuesses || 0;

  const getStatusMessage = () => {
    if (status === 'waiting') return 'Waiting for an opponent...';
    if (status === 'playing') return currentPlayer === playerSymbol ? 'Your turn to guess' : `${players[currentPlayer]?.displayName}'s turn`;
    if (status === 'result') {
      if (winner === 'draw') return "It's a draw!";
      return winner ? `${winner} wins!` : (loser ? `${loser} lost!` : 'Game Over');
    }
    return '';
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Hangman</h1>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md text-center mx-auto mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md">
          <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Wrong: <span className="font-bold text-red-500">{yourWrongGuesses}</span> / 6</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md">
          <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Wrong: <span className="font-bold text-red-500">{opponent?.wrongGuesses || 0}</span> / 6</p>
        </div>
      </div>

      <p className="text-xl font-semibold mb-4 h-8">{getStatusMessage()}</p>

      <HangmanDrawing wrongGuesses={yourWrongGuesses} />

      <p className="text-4xl tracking-[0.3em] mb-6 font-mono font-bold">{wordWithGuesses}</p>

      {status === 'playing' && currentPlayer === playerSymbol && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
          {'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={guessedLetters.includes(letter)}
              className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                guessedLetters.includes(letter)
                  ? word.includes(letter)
                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 opacity-60'
                    : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 hover:scale-110'
              } disabled:cursor-not-allowed`}
            >
              {letter.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {status === 'result' && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md max-w-md mx-auto">
          <p className="text-2xl font-bold mb-2">Game Over!</p>
          <p className="text-lg mb-4">The word was: <span className="font-bold text-blue-500">{word}</span></p>
          <button onClick={handleResetGame} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default function HangmanGame({ gameId, onEnd, singlePlayer = false }) {
  if (singlePlayer) {
    return <HangmanSinglePlayer onEnd={onEnd} />;
  }
  return <HangmanMultiplayer gameId={gameId} onEnd={onEnd} />;
}

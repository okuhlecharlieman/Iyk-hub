'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const words = ['react', 'nextjs', 'firebase', 'tailwind', 'javascript', 'google', 'coding', 'interface'];
const randomWord = () => words[Math.floor(Math.random() * words.length)];

export default function HangmanGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const gameDocRef = doc(db, 'games', gameId);

  // Game setup
  useEffect(() => {
    if (!user) {
      setError("You must be logged in to play.");
      setLoading(false);
      return;
    }

    const joinGame = async () => {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            word: randomWord(),
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
            // Spectator
          }
        }
      } catch (e) {
        setError("Failed to join game: " + e.message);
        setLoading(false);
      }
    };

    joinGame();
  }, [gameId, user, gameDocRef]);

  // Game state listener
  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        checkGameEnd(data);
        setLoading(false);
      } else {
        // Game not found yet, wait for joinGame to create it.
      }
    }, (e) => {
      setError("Game sync error: " + e.message)
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameDocRef]);

  const checkGameEnd = (data) => {
    if (data.status !== 'playing') return;

    const { word, guessedLetters, players } = data;
    const wordGuessed = word.split('').every(letter => guessedLetters.includes(letter));
    const maxWrongGuesses = 6;

    if (wordGuessed) {
      const winner = data.currentPlayer === 'player1' ? players.player1.displayName : players.player2.displayName;
      updateDoc(gameDocRef, { status: 'result', winner });
      if(onEnd && playerSymbol) onEnd(10); 
      return;
    }

    if (players.player1.wrongGuesses >= maxWrongGuesses || players.player2.wrongGuesses >= maxWrongGuesses) {
      const loser = players.player1.wrongGuesses >= maxWrongGuesses ? players.player1.displayName : players.player2.displayName;
      const winner = loser === players.player1.displayName ? players.player2.displayName : players.player1.displayName;
      updateDoc(gameDocRef, { status: 'result', winner: winner, loser: loser });
      if(onEnd && playerSymbol) onEnd(playerSymbol === data.currentPlayer ? 2 : 10);
    }
  };

  const handleGuess = async (letter) => {
    if (!gameState || gameState.currentPlayer !== playerSymbol || gameState.guessedLetters.includes(letter) || gameState.status !== 'playing') return;

    const { word, guessedLetters, players, currentPlayer } = gameState;
    const newGuessedLetters = [...guessedLetters, letter];
    let nextPlayer = currentPlayer;
    const newPlayers = { ...players };

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
    await updateDoc(gameDocRef, {
        word: randomWord(),
        guessedLetters: [],
        players: {
            ...gameState.players,
            player1: {...gameState.players.player1, wrongGuesses: 0},
            player2: gameState.players.player2 ? {...gameState.players.player2, wrongGuesses: 0} : null,
        },
        currentPlayer: 'player1',
        status: gameState.players.player2 ? 'playing' : 'waiting',
        winner: null,
        loser: null
    });
  }

  if (loading) return <p>Loading game...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!gameState) return <p className="text-red-500">Game not found or failed to load.</p>;

  const { word, guessedLetters, players, status, currentPlayer, winner, loser } = gameState;
  const you = players?.[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players?.player2 : players?.player1;
  const wordWithGuesses = word.split('').map(letter => (guessedLetters.includes(letter) ? letter : '_')).join(' ');

  const getStatusMessage = () => {
      if (status === 'waiting') return "Waiting for an opponent...";
      if (status === 'playing') return currentPlayer === playerSymbol ? "Your turn to guess" : `${players[currentPlayer]?.displayName}'s turn`;
      if (status === 'result') {
          if (winner === 'draw') return "It's a draw!";
          return winner ? `${winner} wins!` : (loser ? `${loser} lost!` : "Game Over");
      }
      return "";
  }

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Multiplayer Hangman</h1>

      <div className="grid grid-cols-2 gap-8 w-full text-center mx-auto mb-4">
          <div>
              <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
              <p>Wrong Guesses: {you?.wrongGuesses || 0} / 6</p>
          </div>
          <div>
              <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
              <p>Wrong Guesses: {opponent?.wrongGuesses || 0} / 6</p>
          </div>
      </div>

      <p className="text-xl font-semibold mb-6 h-6">{getStatusMessage()}</p>
      <p className="text-4xl tracking-widest mb-6 font-mono">{wordWithGuesses}</p>

      {status === 'playing' && currentPlayer === playerSymbol && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
            {'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={guessedLetters.includes(letter)}
                className="w-10 h-10 m-1 border rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {letter.toUpperCase()}
              </button>
            ))}
          </div>
      )}
      
      {status === 'result' && (
          <div className="mt-4">
              <p className="text-2xl font-bold mb-2">Game Over!</p>
              <p className="text-lg mb-4">The word was: <span className="font-bold text-blue-500">{word}</span></p>
              <button onClick={handleResetGame} className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">Play Again</button>
          </div>
      )}
    </div>
  );
}

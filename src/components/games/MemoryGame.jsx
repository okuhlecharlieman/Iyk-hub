'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';

const cardEmojis = ['🍎', '🍌', '🍇', '🍒', '🍓', '🍍', '🥝', '🍊'];

const createShuffledCards = () =>
  [...cardEmojis, ...cardEmojis]
    .sort(() => Math.random() - 0.5)
    .map((content, i) => ({ id: i, content, isFlipped: false, isMatched: false }));

export default function MemoryGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null); // 'player1' or 'player2'
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const gameDocRef = doc(db, 'games', gameId);

  useEffect(() => {
    if (!user) {
      setError("You must be logged in to play.");
      return;
    }

    const joinGame = async () => {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            cards: createShuffledCards(),
            players: {
              player1: { uid: user.uid, displayName: user.displayName, score: 0 },
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
              'players.player2': { uid: user.uid, displayName: user.displayName, score: 0 },
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
      }
    };

    joinGame();
  }, [gameId, user, gameDocRef]);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameState(snapshot.data());
      } else {
        setError("Game not found.");
      }
    }, (e) => setError("Game sync error: " + e.message));
    return () => unsubscribe();
  }, [gameDocRef]);

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || isProcessing) return;

    const flippedNotMatched = gameState.cards.filter(c => c.isFlipped && !c.isMatched);

    if (flippedNotMatched.length === 2) {
      setIsProcessing(true);
      const [card1, card2] = flippedNotMatched;
      const isMatch = card1.content === card2.content;

      setTimeout(async () => {
        let newCards = [...gameState.cards];
        let newPlayers = { ...gameState.players };
        let nextPlayer = gameState.currentPlayer;

        if (isMatch) {
          newCards = newCards.map(c =>
            c.id === card1.id || c.id === card2.id ? { ...c, isMatched: true, isFlipped: false } : c
          );
          newPlayers[gameState.currentPlayer].score += 1;
        } else {
          newCards = newCards.map(c =>
            c.id === card1.id || c.id === card2.id ? { ...c, isFlipped: false } : c
          );
          nextPlayer = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
        }

        const allMatched = newCards.every(c => c.isMatched);
        const newStatus = allMatched ? 'result' : 'playing';

        let winner = null;
        if (newStatus === 'result') {
            if (newPlayers.player1.score > newPlayers.player2.score) {
                winner = newPlayers.player1.displayName;
            } else if (newPlayers.player2.score > newPlayers.player1.score) {
                winner = newPlayers.player2.displayName;
            } else {
                winner = 'draw';
            }
            if(onEnd && playerSymbol) {
                const myScore = newPlayers[playerSymbol].score;
                onEnd(myScore * 2); // Simple scoring
            }
        }

        await updateDoc(gameDocRef, {
          cards: newCards,
          players: newPlayers,
          currentPlayer: nextPlayer,
          status: newStatus,
          winner: winner,
        });
        setIsProcessing(false);
      }, 1000);
    }
  }, [gameState, gameDocRef, onEnd, playerSymbol, isProcessing]);

  const handleCardClick = async (card) => {
    if (
      !playerSymbol ||
      isProcessing ||
      gameState.currentPlayer !== playerSymbol ||
      card.isFlipped ||
      card.isMatched ||
      gameState.cards.filter(c => c.isFlipped && !c.isMatched).length >= 2
    ) {
      return;
    }

    const newCards = gameState.cards.map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    await updateDoc(gameDocRef, { cards: newCards });
  };

  const handleResetGame = async () => {
      await updateDoc(gameDocRef, {
          cards: createShuffledCards(),
          players: {
              ...gameState.players,
              player1: {...gameState.players.player1, score: 0},
              player2: gameState.players.player2 ? {...gameState.players.player2, score: 0} : null,
          },
          currentPlayer: 'player1',
          status: gameState.players.player2 ? 'playing' : 'waiting',
          winner: null
      });
  }

  if (error) return <p className="text-red-500">{error}</p>;
  if (!gameState) return <p>Loading game...</p>;

  const { players, status, currentPlayer, winner, cards } = gameState;
  const you = players?.[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players?.player2 : players?.player1;

  const getStatusMessage = () => {
      if (status === 'waiting') return "Waiting for an opponent to join...";
      if (status === 'playing') return currentPlayer === playerSymbol ? "Your turn" : `${players[currentPlayer]?.displayName}'s turn`;
      if (status === 'result') {
          if (winner === 'draw') return "It's a draw!";
          return `${winner} wins!`;
      }
      return "";
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Multiplayer Memory Match</h1>
      
      <div className="grid grid-cols-2 gap-8 w-full max-w-md text-center mx-auto mb-4">
          <div>
              <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
              <p>Score: {you?.score || 0}</p>
          </div>
          <div>
              <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
              <p>Score: {opponent?.score || 0}</p>
          </div>
      </div>

      <p className="text-xl font-semibold mb-4 h-6">{getStatusMessage()}</p>

      <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto mb-4">
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`w-16 h-16 md:w-20 md:h-20 border rounded-lg flex items-center justify-center text-3xl cursor-pointer transform transition-transform duration-500 preserve-3d ${card.isFlipped || card.isMatched ? 'rotate-y-180' : ''}`}>
            <div className="absolute w-full h-full backface-hidden flex items-center justify-center bg-gray-300 dark:bg-gray-600 rounded-lg">
              ?
            </div>
            <div className="absolute w-full h-full rotate-y-180 backface-hidden flex items-center justify-center bg-blue-300 dark:bg-blue-800 rounded-lg">
              {card.content}
            </div>
          </div>
        ))}
      </div>

      {status === 'result' && (
          <button onClick={handleResetGame} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">Play Again</button>
      )}
    </div>
  );
}

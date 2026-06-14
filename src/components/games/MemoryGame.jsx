'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { updateDoc, runTransaction } from 'firebase/firestore';
import useMultiplayerGame from '../../hooks/useMultiplayerGame';

const cardEmojis = ['🍎', '🍌', '🍇', '🍒', '🍓', '🍍', '🥝', '🍊'];

const createShuffledCards = () =>
  [...cardEmojis, ...cardEmojis]
    .sort(() => Math.random() - 0.5)
    .map((content, i) => ({ id: i, content, isFlipped: false, isMatched: false }));

function MemorySinglePlayer({ onEnd }) {
  const [cards, setCards] = useState(createShuffledCards);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const onEndCalledRef = useRef(false);

  const flipped = cards.filter(c => c.isFlipped && !c.isMatched);

  const handleClick = useCallback((card) => {
    if (isProcessing || card.isFlipped || card.isMatched || flipped.length >= 2) return;
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, isFlipped: true } : c));
  }, [isProcessing, flipped.length]);

  useEffect(() => {
    const currentFlipped = cards.filter(c => c.isFlipped && !c.isMatched);
    if (currentFlipped.length !== 2) return;

    setIsProcessing(true);
    setMoves(m => m + 1);
    const [a, b] = currentFlipped;

    const timer = setTimeout(() => {
      if (a.content === b.content) {
        setCards(prev => prev.map(c =>
          c.id === a.id || c.id === b.id ? { ...c, isMatched: true, isFlipped: false } : c
        ));
        setMatchedPairs(p => p + 1);
      } else {
        setCards(prev => prev.map(c =>
          c.id === a.id || c.id === b.id ? { ...c, isFlipped: false } : c
        ));
      }
      setIsProcessing(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [cards]);

  useEffect(() => {
    if (matchedPairs === cardEmojis.length && !onEndCalledRef.current) {
      onEndCalledRef.current = true;
      setGameOver(true);
      const score = Math.max(1, cardEmojis.length * 2 - moves + cardEmojis.length);
      if (onEnd) onEnd({ score, resultKey: `memory-sp:${Date.now()}:${moves}` });
    }
  }, [matchedPairs, moves, onEnd]);

  const reset = () => {
    setCards(createShuffledCards());
    setMoves(0);
    setMatchedPairs(0);
    setGameOver(false);
    setIsProcessing(false);
    onEndCalledRef.current = false;
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Memory Match</h1>
      <div className="flex justify-center gap-6 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-md">
          <span className="text-sm text-gray-500 dark:text-gray-400">Moves</span>
          <p className="text-2xl font-bold text-blue-500">{moves}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-md">
          <span className="text-sm text-gray-500 dark:text-gray-400">Matched</span>
          <p className="text-2xl font-bold text-green-500">{matchedPairs} / {cardEmojis.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleClick(card)}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-xl text-3xl flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer ${
              card.isFlipped || card.isMatched
                ? 'bg-blue-100 dark:bg-blue-800 scale-105'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            } ${card.isMatched ? 'opacity-60' : ''}`}
          >
            {card.isFlipped || card.isMatched ? card.content : '?'}
          </button>
        ))}
      </div>

      {gameOver && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md max-w-md mx-auto">
          <p className="text-2xl font-bold mb-2">All pairs matched!</p>
          <p className="text-lg mb-4">Completed in <span className="font-bold text-blue-500">{moves}</span> moves</p>
          <button onClick={reset} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

const createMemoryInitialState = async (u) => ({
  cards: createShuffledCards(),
  players: {
    player1: { uid: u.uid, displayName: u.displayName, score: 0 },
    player2: null,
  },
  currentPlayer: 'player1',
  status: 'waiting',
  winner: null,
});

function MemoryMultiplayer({ gameId, onEnd }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { gameState, playerSymbol, error, loading, lastResultKeyRef, gameDocRef, user } = useMultiplayerGame(gameId, {
    createInitialState: createMemoryInitialState,
  });

  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || isProcessing) return;

    const flippedNotMatched = gameState.cards.filter(c => c.isFlipped && !c.isMatched);

    if (flippedNotMatched.length === 2) {
      setIsProcessing(true);

      setTimeout(async () => {
        try {
          let finalResult = null;
          await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(gameDocRef);
            if (!snapshot.exists()) return;

            const latest = snapshot.data();
            if (latest.status !== 'playing') return;

            const latestFlipped = latest.cards.filter((c) => c.isFlipped && !c.isMatched);
            if (latestFlipped.length !== 2) return;

            const [latestCard1, latestCard2] = latestFlipped;
            const latestIsMatch = latestCard1.content === latestCard2.content;
            let newCards = [...latest.cards];
            let newPlayers = { ...latest.players };
            let nextPlayer = latest.currentPlayer;

            if (latestIsMatch) {
              newCards = newCards.map((c) =>
                c.id === latestCard1.id || c.id === latestCard2.id ? { ...c, isMatched: true, isFlipped: false } : c
              );
              newPlayers[latest.currentPlayer] = {
                ...newPlayers[latest.currentPlayer],
                score: newPlayers[latest.currentPlayer].score + 1,
              };
            } else {
              newCards = newCards.map((c) =>
                c.id === latestCard1.id || c.id === latestCard2.id ? { ...c, isFlipped: false } : c
              );
              nextPlayer = latest.currentPlayer === 'player1' ? 'player2' : 'player1';
            }

            const allMatched = newCards.every((c) => c.isMatched);
            const newStatus = allMatched ? 'result' : 'playing';

            let winner = null;
            if (newStatus === 'result') {
              if (newPlayers.player1.score > newPlayers.player2.score) winner = newPlayers.player1.displayName;
              else if (newPlayers.player2.score > newPlayers.player1.score) winner = newPlayers.player2.displayName;
              else winner = 'draw';

              finalResult = {
                winner,
                myScore: playerSymbol ? newPlayers[playerSymbol].score : 0,
                resultKey: `memory:${gameId}:${winner}:${newPlayers.player1.score}:${newPlayers.player2.score}`
              };
            }

            transaction.update(gameDocRef, {
              cards: newCards,
              players: newPlayers,
              currentPlayer: nextPlayer,
              status: newStatus,
              winner,
            });
          });

          if (finalResult && onEnd && playerSymbol && lastResultKeyRef.current !== finalResult.resultKey) {
            lastResultKeyRef.current = finalResult.resultKey;
            onEnd({ score: finalResult.myScore * 2, resultKey: finalResult.resultKey });
          }
        } catch (err) {
          setError('Failed to resolve memory round: ' + err.message);
        } finally {
          setIsProcessing(false);
        }
      }, 1000);
    }
  }, [gameState, gameDocRef, onEnd, playerSymbol, isProcessing, gameId]);

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
        player1: { ...gameState.players.player1, score: 0 },
        player2: gameState.players.player2 ? { ...gameState.players.player2, score: 0 } : null,
      },
      currentPlayer: 'player1',
      status: gameState.players.player2 ? 'playing' : 'waiting',
      winner: null
    });
  };

  if (loading) return <p className="text-center py-8">Loading game...</p>;
  if (error) return <p className="text-red-500 text-center py-8">{error}</p>;
  if (!gameState) return <p className="text-red-500 text-center py-8">Game not found or failed to load.</p>;

  const { players, status, currentPlayer, winner, cards } = gameState;
  const you = players?.[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players?.player2 : players?.player1;

  const getStatusMessage = () => {
    if (status === 'waiting') return 'Waiting for an opponent to join...';
    if (status === 'playing') return currentPlayer === playerSymbol ? 'Your turn' : `${players[currentPlayer]?.displayName}'s turn`;
    if (status === 'result') {
      if (winner === 'draw') return "It's a draw!";
      return `${winner} wins!`;
    }
    return '';
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Memory Match</h1>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md text-center mx-auto mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md">
          <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
          <p className="text-2xl font-bold text-blue-500">{you?.score || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md">
          <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
          <p className="text-2xl font-bold text-red-500">{opponent?.score || 0}</p>
        </div>
      </div>

      <p className="text-xl font-semibold mb-4 h-8">{getStatusMessage()}</p>

      <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-xl text-3xl flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer ${
              card.isFlipped || card.isMatched
                ? 'bg-blue-100 dark:bg-blue-800 scale-105'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            } ${card.isMatched ? 'opacity-60' : ''}`}
          >
            {card.isFlipped || card.isMatched ? card.content : '?'}
          </button>
        ))}
      </div>

      {status === 'result' && (
        <button onClick={handleResetGame} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
          Play Again
        </button>
      )}
    </div>
  );
}

export default function MemoryGame({ gameId, onEnd, singlePlayer = false }) {
  if (singlePlayer) {
    return <MemorySinglePlayer onEnd={onEnd} />;
  }
  return <MemoryMultiplayer gameId={gameId} onEnd={onEnd} />;
}

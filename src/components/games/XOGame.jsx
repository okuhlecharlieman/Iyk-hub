'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

function calculateWinner(bd) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) return bd[a];
  }
  if (bd.every(cell => cell)) return 'draw';
  return '';
}

function XOSinglePlayer({ onEnd }) {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [playerSymbol] = useState('X');
  const [winner, setWinner] = useState('');
  const hasEnded = useRef(false);

  const aiMove = (currentBoard) => {
    const empty = currentBoard.map((c, i) => c === '' ? i : null).filter(i => i !== null);
    if (empty.length === 0) return currentBoard;

    const aiSymbol = 'O';

    for (const idx of empty) {
      const test = [...currentBoard];
      test[idx] = aiSymbol;
      if (calculateWinner(test) === aiSymbol) {
        return test;
      }
    }

    for (const idx of empty) {
      const test = [...currentBoard];
      test[idx] = playerSymbol;
      if (calculateWinner(test) === playerSymbol) {
        const result = [...currentBoard];
        result[idx] = aiSymbol;
        return result;
      }
    }

    if (currentBoard[4] === '') {
      const result = [...currentBoard];
      result[4] = aiSymbol;
      return result;
    }

    const pick = empty[Math.floor(Math.random() * empty.length)];
    const result = [...currentBoard];
    result[pick] = aiSymbol;
    return result;
  };

  const handleClick = (idx) => {
    if (board[idx] !== '' || winner !== '') return;

    const newBoard = [...board];
    newBoard[idx] = playerSymbol;
    const result = calculateWinner(newBoard);

    if (result) {
      setBoard(newBoard);
      setWinner(result);
      return;
    }

    const afterAi = aiMove(newBoard);
    const aiResult = calculateWinner(afterAi);
    setBoard(afterAi);
    if (aiResult) setWinner(aiResult);
  };

  useEffect(() => {
    if (winner && onEnd && !hasEnded.current) {
      hasEnded.current = true;
      let score = 0;
      if (winner === 'draw') score = 5;
      else if (winner === playerSymbol) score = 10;
      else score = 2;
      onEnd(score);
    }
  }, [winner, onEnd, playerSymbol]);

  const handleReset = () => {
    setBoard(Array(9).fill(''));
    setWinner('');
    hasEnded.current = false;
  };

  const getStatusMessage = () => {
    if (winner === 'draw') return "It's a draw!";
    if (winner === playerSymbol) return 'You win!';
    if (winner) return 'Computer wins!';
    return 'Your turn (X)';
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Tic-Tac-Toe — Single Player</h2>
      <h3 className="mb-4 text-lg font-semibold">{getStatusMessage()}</h3>
      <div className="grid grid-cols-3 gap-2 max-w-[264px] mx-auto">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className="w-20 h-20 text-3xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            disabled={winner !== '' || cell !== ''}
          >
            <span className={cell === 'X' ? 'text-blue-500' : 'text-red-500'}>{cell}</span>
          </button>
        ))}
      </div>
      {winner && (
        <div className="mt-6">
          <p className="text-xl font-bold mb-3">
            {winner === 'draw' ? 'Draw game!' : `Winner: ${winner}`}
          </p>
          <button onClick={handleReset} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

function XOMultiplayer({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onEndCalled, setOnEndCalled] = useState(false);
  const lastResultKeyRef = useRef(null);
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
            board: Array(9).fill(''),
            currentPlayer: 'X',
            winner: '',
            players: { X: { uid: user.uid, displayName: user.displayName }, O: null }
          });
          setPlayerSymbol('X');
        } else {
          const data = snap.data();
          if (!data.players.O && data.players.X?.uid !== user.uid) {
            await updateDoc(gameDocRef, { 'players.O': { uid: user.uid, displayName: user.displayName } });
            setPlayerSymbol('O');
          } else if (data.players.X?.uid === user.uid) {
            setPlayerSymbol('X');
          } else if (data.players.O?.uid === user.uid) {
            setPlayerSymbol('O');
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

  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        if (!data.winner) {
          setOnEndCalled(false);
        }
        setLoading(false);
      }
    }, (e) => {
      setError('Game sync error: ' + e.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameId, gameDocRef]);

  useEffect(() => {
    if (gameState?.winner && onEnd && !onEndCalled) {
      let finalScore = 0;
      if (gameState.winner === 'draw') {
        finalScore = 5;
      } else if (gameState.winner === playerSymbol) {
        finalScore = 10;
      } else {
        finalScore = 2;
      }

      const resultKey = `xo:${gameId}:${gameState.winner}:${gameState.board.join('')}`;
      if (playerSymbol && lastResultKeyRef.current !== resultKey) {
        lastResultKeyRef.current = resultKey;
        onEnd({ score: finalScore, resultKey });
        setOnEndCalled(true);
      }
    }
  }, [gameState, onEnd, onEndCalled, playerSymbol, gameId]);

  async function handleClick(idx) {
    if (gameState.board[idx] !== '' || gameState.winner !== '' || gameState.currentPlayer !== playerSymbol) return;
    const newBoard = [...gameState.board];
    newBoard[idx] = playerSymbol;
    const newWinner = calculateWinner(newBoard);
    const nextPlayer = (playerSymbol === 'X') ? 'O' : 'X';
    try {
      await updateDoc(gameDocRef, {
        board: newBoard,
        currentPlayer: newWinner ? '' : nextPlayer,
        winner: newWinner
      });
    } catch (e) {
      setError('Move failed: ' + e.message);
    }
  }

  async function handleReset() {
    try {
      await updateDoc(gameDocRef, {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        winner: ''
      });
    } catch (e) {
      setError('Reset failed: ' + e.message);
    }
  }

  if (loading) return <p>Loading game...</p>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!gameState) return <p className="text-red-500">Game not found or failed to load.</p>;

  const { board, currentPlayer, winner, players } = gameState;

  const getStatusMessage = () => {
    if (winner) return 'Game Over';
    if (!players.X || !players.O) return 'Waiting for opponent...';
    return currentPlayer === playerSymbol ? 'Your turn' : `${players[currentPlayer]?.displayName}'s turn`;
  };

  return (
    <div className="text-center">
      <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Room: <span className="font-mono text-sm">{gameId}</span></h2>
      <div className="grid grid-cols-2 gap-8 max-w-md mx-auto text-center mb-4">
        <p className="font-semibold">X: {players.X ? players.X.displayName : '...'}</p>
        <p className="font-semibold">O: {players.O ? players.O.displayName : '...'}</p>
      </div>
      <h3 className="mb-4 text-lg font-semibold">{getStatusMessage()}</h3>
      <div className="grid grid-cols-3 gap-2 max-w-[264px] mx-auto">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className="w-20 h-20 text-3xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            disabled={
              winner !== '' ||
              currentPlayer !== playerSymbol ||
              !playerSymbol ||
              (playerSymbol !== 'X' && playerSymbol !== 'O')
            }
          >
            <span className={cell === 'X' ? 'text-blue-500' : 'text-red-500'}>{cell}</span>
          </button>
        ))}
      </div>
      {winner && (
        <div className="mt-6">
          <p className="text-xl font-bold mb-3">{winner === 'draw' ? 'Draw game!' : `Winner: ${winner}`}</p>
          {(playerSymbol === 'X' || playerSymbol === 'O') && (
            <button onClick={handleReset} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Reset Game
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function XOGame({ gameId, onEnd, singlePlayer = false }) {
  if (singlePlayer) {
    return <XOSinglePlayer onEnd={onEnd} />;
  }
  return <XOMultiplayer gameId={gameId} onEnd={onEnd} />;
}

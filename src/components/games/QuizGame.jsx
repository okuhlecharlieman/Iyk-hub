/**
 * QuizGame — single-player and multiplayer quiz.
 * Questions are fetched from /api/games/content?type=quiz (Firestore-backed).
 * Falls back to built-in defaults if the API is unavailable.
 */
'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, runTransaction } from 'firebase/firestore';

// Minimal hardcoded fallback if API fails
const FALLBACK_QUESTIONS = [
  { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Chloroplast'], answer: 'Mitochondrion' },
  { question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars' },
  { question: 'What is the capital of Japan?', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], answer: 'Tokyo' },
  { question: 'What is the chemical symbol for Gold?', options: ['Au', 'Ag', 'Go', 'Gd'], answer: 'Au' },
  { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: '7' },
];

/** Fetch quiz questions from the game content API, falling back to hardcoded. */
async function fetchQuizQuestions() {
  try {
    const res = await fetch('/api/games/content?type=quiz');
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) return data.items;
    }
  } catch { /* silent */ }
  return FALLBACK_QUESTIONS;
}

const shuffleAndPick = (all, count = 5) => {
  return [...all].sort(() => 0.5 - Math.random()).slice(0, count);
};

function QuizSinglePlayer({ onEnd }) {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localQuestions, setLocalQuestions] = useState([]);
  const [localIndex, setLocalIndex] = useState(0);
  const [localScore, setLocalScore] = useState(0);
  const [localFinished, setLocalFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Fetch questions from API on mount
  useEffect(() => {
    if (!user) {
      setError('You must be logged in to play.');
      setLoading(false);
      return;
    }
    fetchQuizQuestions().then((all) => {
      setLocalQuestions(shuffleAndPick(all, 5));
      setLoading(false);
    });
  }, [user]);

  const handleAnswerSingle = (option) => {
    if (isProcessing || localFinished || !localQuestions[localIndex] || !user) return;

    setIsProcessing(true);
    setSelectedAnswer(option);
    setShowResult(true);

    const current = localQuestions[localIndex];
    const isCorrect = current.answer === option;
    const scoreDelta = isCorrect ? 10 : 0;
    const updatedScore = localScore + scoreDelta;
    setLocalScore(updatedScore);

    setTimeout(() => {
      const nextIdx = localIndex + 1;
      if (nextIdx >= localQuestions.length) {
        setLocalFinished(true);
        if (onEnd) onEnd(updatedScore);
      } else {
        setLocalIndex(nextIdx);
        setSelectedAnswer(null);
        setShowResult(false);
      }
      setIsProcessing(false);
    }, 1500);
  };

  if (loading) return <p className="text-center py-8">Loading quiz...</p>;
  if (error) return <p className="text-red-500 text-center py-8">{error}</p>;

  const currentQuestion = localQuestions[localIndex];

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Quiz</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-lg">Score: <span className="font-bold text-blue-500">{localScore}</span></p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Question {localIndex + 1} / {localQuestions.length}</p>
      </div>

      {localFinished ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md">
          <p className="text-2xl font-bold mb-4">Quiz Complete!</p>
          <p className="text-4xl font-bold text-blue-500 mb-6">{localScore} pts</p>
          <button onClick={() => router.push('/games')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
            Return to Games
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
          <p className="text-xl font-semibold mb-6">{currentQuestion.question}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentQuestion.options.map((option) => {
              let btnClass = 'px-4 py-3 border-2 rounded-xl font-medium transition-all duration-300 text-left';
              if (showResult) {
                if (option === currentQuestion.answer) {
                  btnClass += ' bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200';
                } else if (option === selectedAnswer) {
                  btnClass += ' bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
                } else {
                  btnClass += ' bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50';
                }
              } else {
                btnClass += ' bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400';
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswerSingle(option)}
                  disabled={isProcessing}
                  className={btnClass}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizMultiplayer({ gameId, onEnd }) {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
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
          const allQ = await fetchQuizQuestions();
          await setDoc(gameDocRef, {
            questions: shuffleAndPick(allQ, 5),
            currentQuestionIndex: 0,
            players: {
              player1: { uid: user.uid, displayName: user.displayName, score: 0, answer: null },
              player2: null,
            },
            status: 'waiting',
            winner: null,
          });
          setPlayerRole('player1');
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            await updateDoc(gameDocRef, {
              'players.player2': { uid: user.uid, displayName: user.displayName, score: 0, answer: null },
              status: 'playing',
            });
            setPlayerRole('player2');
          } else if (data.players.player1?.uid === user.uid) {
            setPlayerRole('player1');
          } else if (data.players.player2?.uid === user.uid) {
            setPlayerRole('player2');
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

  const processAnswers = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        let finalResult = null;
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(gameDocRef);
          if (!snapshot.exists()) return;

          const latest = snapshot.data();
          if (latest.status !== 'playing' || !latest.players.player1?.answer || !latest.players.player2?.answer) return;

          const { players, questions, currentQuestionIndex } = latest;
          const correctAnswer = questions[currentQuestionIndex].answer;

          const p1Score = players.player1.score + (players.player1.answer === correctAnswer ? 1 : 0);
          const p2Score = players.player2.score + (players.player2.answer === correctAnswer ? 1 : 0);

          const nextIndex = currentQuestionIndex + 1;
          if (nextIndex < questions.length) {
            transaction.update(gameDocRef, {
              'players.player1.score': p1Score,
              'players.player1.answer': null,
              'players.player2.score': p2Score,
              'players.player2.answer': null,
              currentQuestionIndex: nextIndex,
            });
            return;
          }

          let winner = null;
          if (p1Score > p2Score) winner = players.player1.displayName;
          else if (p2Score > p1Score) winner = players.player2.displayName;
          else winner = 'draw';

          finalResult = {
            myFinalScore: playerRole === 'player1' ? p1Score : p2Score,
            resultKey: `quiz:${gameId}:${winner}:${p1Score}:${p2Score}`,
          };

          transaction.update(gameDocRef, {
            'players.player1.score': p1Score,
            'players.player1.answer': null,
            'players.player2.score': p2Score,
            'players.player2.answer': null,
            status: 'result',
            winner,
          });
        });

        if (finalResult && onEnd && playerRole && lastResultKeyRef.current !== finalResult.resultKey) {
          lastResultKeyRef.current = finalResult.resultKey;
          onEnd({ score: finalResult.myFinalScore * 2, resultKey: finalResult.resultKey });
        }
      } catch (err) {
        setError('Failed to score quiz round: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  }, [gameId, gameDocRef, isProcessing, onEnd, playerRole]);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        setLoading(false);
        if (data.status === 'playing' && data.players.player1?.answer && data.players.player2?.answer) {
          processAnswers();
        }
      }
    }, (e) => {
      setError('Game sync error: ' + e.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameDocRef, processAnswers]);

  const handleAnswer = async (option) => {
    if (!playerRole || gameState.status !== 'playing' || isProcessing || gameState.players[playerRole].answer) return;
    await updateDoc(gameDocRef, { [`players.${playerRole}.answer`]: option });
  };

  const handleResetGame = async () => {
    if (gameState.status !== 'result') return;
    const allQ = await fetchQuizQuestions();
    await updateDoc(gameDocRef, {
      questions: shuffleAndPick(allQ, 5),
      currentQuestionIndex: 0,
      'players.player1.score': 0,
      'players.player1.answer': null,
      'players.player2.score': gameState.players.player2 ? 0 : null,
      'players.player2.answer': gameState.players.player2 ? null : undefined,
      status: gameState.players.player2 ? 'playing' : 'waiting',
      winner: null,
    });
  };

  if (loading) return <p className="text-center py-8">Loading quiz...</p>;
  if (error) return <p className="text-red-500 text-center py-8">{error}</p>;
  if (!gameState) return <p className="text-red-500 text-center py-8">Game not found or failed to load.</p>;

  const { players, status, currentQuestionIndex, questions, winner } = gameState;
  const you = players?.[playerRole];
  const opponent = playerRole === 'player1' ? players?.player2 : players?.player1;
  const currentQuestion = questions[currentQuestionIndex];

  const getStatusMessage = () => {
    if (status === 'waiting') return 'Waiting for opponent...';
    if (status === 'playing') {
      if (!you) return 'Spectating...';
      if (you.answer && !opponent?.answer) return 'Waiting for opponent to answer...';
      if (!you.answer && opponent?.answer) return 'Opponent has answered. Your turn!';
      if (you.answer && opponent?.answer) return 'Calculating results...';
      return 'Choose your answer!';
    }
    if (status === 'result') return winner === 'draw' ? "It's a draw!" : `${winner} wins!`;
    return '';
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Quiz</h1>

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

      <p className="text-xl font-semibold mb-6 h-8">{getStatusMessage()}</p>

      {status === 'playing' && currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Question {currentQuestionIndex + 1} / {questions.length}
          </p>
          <p className="text-xl font-semibold mb-6">{currentQuestion.question}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentQuestion.options.map(option => {
              const yourAnswer = you?.answer;
              const oppAnswer = opponent?.answer;
              const bothAnswered = yourAnswer && oppAnswer;
              const isCorrect = option === currentQuestion.answer;

              let buttonClass = 'px-4 py-3 border-2 rounded-xl font-medium transition-all duration-300 text-left';
              if (bothAnswered) {
                if (isCorrect) buttonClass += ' bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200';
                else if (option === yourAnswer || option === oppAnswer) buttonClass += ' bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
                else buttonClass += ' bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50';
              } else if (yourAnswer === option) {
                buttonClass += ' bg-blue-100 dark:bg-blue-900/50 border-blue-500 text-blue-800 dark:text-blue-200';
              } else {
                buttonClass += ' bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400';
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={!playerRole || isProcessing || you?.answer}
                  className={buttonClass}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {status === 'result' && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
          <p className="text-2xl font-bold mb-4">Final Score</p>
          <p className="text-lg">{players.player1.displayName}: <span className="font-bold">{players.player1.score}</span></p>
          <p className="text-lg mb-4">{players.player2.displayName}: <span className="font-bold">{players.player2.score}</span></p>
          <button onClick={handleResetGame} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuizGame({ gameId, onEnd, singlePlayer = false }) {
  if (singlePlayer) {
    return <QuizSinglePlayer onEnd={onEnd} />;
  }
  return <QuizMultiplayer gameId={gameId} onEnd={onEnd} />;
}

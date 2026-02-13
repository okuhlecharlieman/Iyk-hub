'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';

// Keep a larger, more diverse set of questions.
const allQuestions = [
    { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Chloroplast'], answer: 'Mitochondrion' },
    { question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars' },
    { question: 'What is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Great White Shark'], answer: 'Blue Whale' },
    { question: 'Who wrote the play \'Romeo and Juliet\'?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], answer: 'William Shakespeare' },
    { question: 'What is the chemical symbol for Gold?', options: ['Au', 'Ag', 'Go', 'Gd'], answer: 'Au' },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: '7' },
    { question: 'What is the capital of Japan?', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], answer: 'Tokyo' },
    { question: 'Which is the only vowel on a standard keyboard that is not on the top row?', options: ['A', 'E', 'I', 'O'], answer: 'A' },
    { question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 'Diamond' },
    { question: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], answer: '3' }
  ];
  
  const shuffleAndPickQuestions = (count = 5) => {
    return [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, count);
  };

export default function QuizGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'player1' or 'player2'
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const gameDocRef = doc(db, 'games', gameId);

  useEffect(() => {
    if (!user) {
      setError('You must be logged in to play.');
      return;
    }

    const joinGame = async () => {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            questions: shuffleAndPickQuestions(),
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
            // Spectator
          }
        }
      } catch (e) {
        setError('Failed to join game: ' + e.message);
      }
    };

    joinGame();
  }, [gameId, user, gameDocRef]);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        // If both players have answered, process the result
        if (data.status === 'playing' && data.players.player1?.answer && data.players.player2?.answer) {
          processAnswers(data);
        }
      } else {
        setError('Game not found.');
      }
    }, (e) => setError('Game sync error: ' + e.message));
    return () => unsubscribe();
  }, [gameDocRef]);

  const processAnswers = async (data) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const { players, questions, currentQuestionIndex } = data;
    const correctAnswer = questions[currentQuestionIndex].answer;
    const newPlayers = { ...players };

    if (newPlayers.player1.answer === correctAnswer) newPlayers.player1.score += 1;
    if (newPlayers.player2.answer === correctAnswer) newPlayers.player2.score += 1;

    setTimeout(async () => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        await updateDoc(gameDocRef, {
          players: newPlayers,
          currentQuestionIndex: nextIndex,
          'players.player1.answer': null,
          'players.player2.answer': null,
        });
      } else {
        let winner = null;
        if (newPlayers.player1.score > newPlayers.player2.score) winner = newPlayers.player1.displayName;
        else if (newPlayers.player2.score > newPlayers.player1.score) winner = newPlayers.player2.displayName;
        else winner = 'draw';

        await updateDoc(gameDocRef, { 
            players: newPlayers, 
            status: 'result', 
            winner: winner 
        });
        
        if(onEnd && playerRole) {
            const myFinalScore = newPlayers[playerRole].score;
            onEnd(myFinalScore * 2); // Award points
        }
      }
      setIsProcessing(false);
    }, 2000); // Wait 2 seconds before moving to next question or result
  };

  const handleAnswer = async (option) => {
    if (!playerRole || gameState.status !== 'playing' || isProcessing || gameState.players[playerRole].answer) return;
    await updateDoc(gameDocRef, { [`players.${playerRole}.answer`]: option });
  };

  const handleResetGame = async () => {
    if(gameState.status !== 'result') return;
    await updateDoc(gameDocRef, {
        questions: shuffleAndPickQuestions(),
        currentQuestionIndex: 0,
        players: {
            player1: {...gameState.players.player1, score: 0, answer: null},
            player2: gameState.players.player2 ? {...gameState.players.player2, score: 0, answer: null} : null,
        },
        status: gameState.players.player2 ? 'playing' : 'waiting',
        winner: null,
    });
  }

  if (error) return <p className="text-red-500">{error}</p>;
  if (!gameState) return <p>Loading quiz...</p>;

  const { players, status, currentQuestionIndex, questions, winner } = gameState;
  const you = players?.[playerRole];
  const opponent = playerRole === 'player1' ? players?.player2 : players?.player1;
  const currentQuestion = questions[currentQuestionIndex];

  const getStatusMessage = () => {
      if (status === 'waiting') return "Waiting for opponent...";
      if (status === 'playing') {
          if(!you) return "Spectating...";
          if(you.answer && !opponent?.answer) return "Waiting for opponent to answer...";
          if(!you.answer && opponent?.answer) return "Opponent has answered. Your turn!";
          if(you.answer && opponent?.answer) return "Calculating results...";
          return "Choose your answer!";
      }
      if (status === 'result') return winner === 'draw' ? "It's a draw!" : `${winner} wins!`;
      return "";
  }

  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Multiplayer Quiz</h1>

      <div className="grid grid-cols-2 gap-8 w-full text-center mx-auto mb-4">
          <div>
              <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
              <p>Score: {you?.score || 0}</p>
          </div>
          <div>
              <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
              <p>Score: {opponent?.score || 0}</p>
          </div>
      </div>
      <p className="text-xl font-semibold mb-6 h-6">{getStatusMessage()}</p>

      {status === 'playing' && currentQuestion && (
        <div>
          <p className="text-2xl mb-4">{currentQuestion.question}</p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {currentQuestion.options.map(option => {
                const yourAnswer = you?.answer;
                const oppAnswer = opponent?.answer;
                const bothAnswered = yourAnswer && oppAnswer;
                const isCorrect = option === currentQuestion.answer;

                let buttonClass = 'px-4 py-3 border rounded-lg transition-colors duration-300';
                if (bothAnswered) {
                    if(isCorrect) buttonClass += ' bg-green-500 text-white';
                    else if(option === yourAnswer || option === oppAnswer) buttonClass += ' bg-red-500 text-white';
                    else buttonClass += ' bg-gray-300 dark:bg-gray-600';
                } else if (yourAnswer === option) {
                    buttonClass += ' bg-blue-400 dark:bg-blue-800 text-white';
                } else {
                    buttonClass += ' bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600';
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
              )
            })}
          </div>
        </div>
      )}

      {status === 'result' && (
        <div className="mt-4">
            <p className="text-2xl font-bold mb-4">Final Score</p>
            <p className="text-lg">{`${players.player1.displayName}: ${players.player1.score}`}</p>
            <p className="text-lg mb-4">{`${players.player2.displayName}: ${players.player2.score}`}</p>
            <button onClick={handleResetGame} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">Play Again</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';

const questions = [
  {
    question: 'What is the capital of France?',
    options: ['Paris', 'London', 'Berlin', 'Madrid'],
    answer: 'Paris'
  },
  {
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    answer: '4'
  },
  {
    question: 'What is the largest planet in our solar system?',
    options: ['Earth', 'Jupiter', 'Mars', 'Saturn'],
    answer: 'Jupiter'
  }
];

export default function QuizGame() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  function handleAnswer(option) {
    if (option === questions[currentQuestion].answer) {
      setScore(score + 1);
    }
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowResult(true);
    }
  }

  function resetGame() {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Quiz</h1>
      {showResult ? (
        <div>
          <p className="text-xl font-bold">Your score: {score}/{questions.length}</p>
          <button onClick={resetGame} className="mt-4 px-4 py-2 border rounded-lg">Play Again</button>
        </div>
      ) : (
        <div>
          <p className="text-lg mb-2">{questions[currentQuestion].question}</p>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {questions[currentQuestion].options.map(option => (
              <button key={option} onClick={() => handleAnswer(option)} className="px-4 py-2 border rounded-lg">
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';

const choices = ['rock', 'paper', 'scissors'];

export default function RPSGame() {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState('');
  const [scores, setScores] = useState({ player: 0, computer: 0 });

  function handlePlayerChoice(choice) {
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];
    setPlayerChoice(choice);
    setComputerChoice(computerChoice);
  }

  useEffect(() => {
    if (playerChoice && computerChoice) {
      if (playerChoice === computerChoice) {
        setResult('It\'s a tie!');
      } else if (
        (playerChoice === 'rock' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'rock') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
      ) {
        setResult('You win!');
        setScores(prevScores => ({ ...prevScores, player: prevScores.player + 1 }));
      } else {
        setResult('You lose!');
        setScores(prevScores => ({ ...prevScores, computer: prevScores.computer + 1 }));
      }
    }
  }, [playerChoice, computerChoice]);

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Rock, Paper, Scissors</h1>
      <div className="flex justify-center gap-4 mb-4">
        {choices.map(choice => (
          <button key={choice} onClick={() => handlePlayerChoice(choice)} className="px-4 py-2 border rounded-lg">
            {choice}
          </button>
        ))}
      </div>
      {playerChoice && computerChoice && (
        <div className="mt-4">
          <p>Your choice: {playerChoice}</p>
          <p>Computer\'s choice: {computerChoice}</p>
          <p className="text-xl font-bold mt-2">{result}</p>
        </div>
      )}
      <div className="mt-4 text-lg">
        <p>Player: {scores.player}</p>
        <p>Computer: {scores.computer}</p>
      </div>
    </div>
  );
}

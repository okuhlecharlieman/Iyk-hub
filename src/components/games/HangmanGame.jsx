'use client';
import { useState, useEffect } from 'react';

const words = ['react', 'nextjs', 'firebase', 'tailwind', 'javascript'];
const randomWord = () => words[Math.floor(Math.random() * words.length)];

export default function HangmanGame() {
  const [word, setWord] = useState(randomWord());
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);

  const maxWrongGuesses = 6;
  const wordWithGuesses = word.split('').map(letter => guessedLetters.includes(letter) ? letter : '_').join(' ');
  const isWinner = !wordWithGuesses.includes('_');
  const isLoser = wrongGuesses >= maxWrongGuesses;

  function handleGuess(letter) {
    if (guessedLetters.includes(letter)) return;
    setGuessedLetters([...guessedLetters, letter]);
    if (!word.includes(letter)) {
      setWrongGuesses(wrongGuesses + 1);
    }
  }

  function resetGame() {
    setWord(randomWord());
    setGuessedLetters([]);
    setWrongGuesses(0);
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Hangman</h1>
      <p className="text-2xl mb-4">{wordWithGuesses}</p>
      <p>Wrong guesses: {wrongGuesses}</p>
      <div className="mt-4">
        {'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => (
          <button 
            key={letter} 
            onClick={() => handleGuess(letter)} 
            disabled={guessedLetters.includes(letter) || isWinner || isLoser}
            className="w-8 h-8 m-1 border rounded disabled:bg-gray-300"
          >
            {letter}
          </button>
        ))}
      </div>
      {(isWinner || isLoser) && (
        <div className="mt-4">
          {isWinner && <p className="text-xl font-bold">You win!</p>}
          {isLoser && <p className="text-xl font-bold">You lose! The word was: {word}</p>}
          <button onClick={resetGame} className="mt-2 px-4 py-2 border rounded-lg">Play Again</button>
        </div>
      )}
    </div>
  );
}

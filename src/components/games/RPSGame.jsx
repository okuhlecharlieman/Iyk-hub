'use client';
import { useState, useEffect } from 'react';
import { FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa';
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

const choices = [
  { id: 'rock', icon: <FaHandRock size={40} /> },
  { id: 'paper', icon: <FaHandPaper size={40} /> },
  { id: 'scissors', icon: <FaHandScissors size={40} /> },
];

export default function RPSGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState("");
  const gameDocRef = doc(db, "games", gameId);

  // Join or create game room
  useEffect(() => {
    if (!user) {
      setError("You must be logged in to play.");
      return;
    }

    async function joinGame() {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            players: { 
              player1: { uid: user.uid, displayName: user.displayName, choice: null, score: 0 },
              player2: null 
            },
            status: 'waiting', // waiting, playing, result
            result: ''
          });
          setPlayerSymbol("player1");
        } else {
          const data = snap.data();
          if (!data.players.player2 && data.players.player1?.uid !== user.uid) {
            await updateDoc(gameDocRef, { 
              "players.player2": { uid: user.uid, displayName: user.displayName, choice: null, score: 0 },
              "status": 'playing'
            });
            setPlayerSymbol("player2");
          } else if (data.players.player1?.uid === user.uid) {
            setPlayerSymbol("player1");
          } else if (data.players.player2?.uid === user.uid) {
            setPlayerSymbol("player2");
          } else {
            // Spectator
          }
        }
      } catch (e) {
        setError("Failed to join game: " + e.message);
      }
    }
    joinGame();
  }, [gameId, user, gameDocRef]);

  // Listen for game state
  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);

        // Determine winner when both have chosen
        if (data.status === 'playing' && data.players.player1?.choice && data.players.player2?.choice) {
            const p1c = data.players.player1.choice;
            const p2c = data.players.player2.choice;
            let resultText = '';
            let p1Score = data.players.player1.score;
            let p2Score = data.players.player2.score;

            if (p1c === p2c) {
                resultText = "It's a tie!";
            } else if (
                (p1c === 'rock' && p2c === 'scissors') ||
                (p1c === 'paper' && p2c === 'rock') ||
                (p1c === 'scissors' && p2c === 'paper')
            ) {
                resultText = `${data.players.player1.displayName} wins!`;
                p1Score += 1;
            } else {
                resultText = `${data.players.player2.displayName} wins!`;
                p2Score += 1;
            }

            updateDoc(gameDocRef, {
                status: 'result',
                result: resultText,
                'players.player1.score': p1Score,
                'players.player2.score': p2Score
            });
        }

      }
    }, (e) => setError("Game sync error: " + e.message));
    return () => unsubscribe();
  }, [gameDocRef]);

  const handleUserChoice = async (choiceId) => {
    if (!playerSymbol || !gameState || gameState.status !== 'playing') return;
    
    const playerChoicePath = `players.${playerSymbol}.choice`;
    if (gameState.players[playerSymbol].choice) return; // Already chosen

    try {
      await updateDoc(gameDocRef, {
        [playerChoicePath]: choiceId
      });
    } catch (e) {
      setError("Failed to make choice: " + e.message);
    }
  };

  const handleNextRound = async () => {
    if (gameState.status !== 'result') return;
    try {
        await updateDoc(gameDocRef, {
            'players.player1.choice': null,
            'players.player2.choice': null,
            status: 'playing',
            result: ''
        });
    } catch (e) {
        setError("Failed to start next round: " + e.message);
    }
  };
  
  const handleEndGame = () => {
      if (onEnd) {
          const playerScore = gameState.players[playerSymbol].score;
          onEnd(playerScore);
      }
      // Maybe navigate away or show a final summary
  };


  if (error) return <div className="text-red-600">{error}</div>;
  if (!gameState) return <div>Loading game...</div>;
  
  const { players, status, result } = gameState;
  const you = players[playerSymbol];
  const opponent = playerSymbol === 'player1' ? players.player2 : players.player1;

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Rock, Paper, Scissors</h2>
      <p className="mb-2">Room: {gameId}</p>
      
      <div className="grid grid-cols-2 gap-8 w-full max-w-md text-center">
          <div>
              <p className="font-bold text-lg">{you?.displayName || 'You'}</p>
              <p>Score: {you?.score || 0}</p>
          </div>
          <div>
              <p className="font-bold text-lg">{opponent?.displayName || 'Waiting...'}</p>
              <p>Score: {opponent?.score || 0}</p>
          </div>
      </div>

      {status === 'waiting' && <p className="mt-4">Waiting for another player to join...</p>}
      
      {status === 'playing' && (
          <div className="mt-8">
              <p className="mb-4">Choose your weapon!</p>
              <div className="flex justify-center gap-8 mb-8">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleUserChoice(choice.id)}
                    disabled={!!you?.choice}
                    className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    {choice.icon}
                  </button>
                ))}
              </div>
              {you?.choice && !opponent?.choice && <p>Waiting for opponent to choose...</p>}
              {you?.choice && opponent?.choice && <p>Both players have chosen. Calculating result...</p>}
          </div>
      )}

      {status === 'result' && (
        <div className="text-center mt-8">
            <p>Your choice: {you.choice}</p>
            <p>{opponent.displayName}'s choice: {opponent.choice}</p>
            <p className="text-xl font-bold mt-4">{result}</p>
            <button onClick={handleNextRound} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Next Round</button>
        </div>
      )}

      <div className="mt-8">
        <button onClick={handleEndGame} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">End Game</button>
      </div>
    </div>
  );
}

// components/games/XOGame.jsx
// Multiplayer TicTacToe with Firestore sync

"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

export default function XOGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [onEndCalled, setOnEndCalled] = useState(false);
  const gameDocRef = doc(db, "games", gameId);

  // Join or create game room
  useEffect(() => {
    if (!user) {
      setError("You must be logged in to play.");
      setLoading(false);
      return;
    }
    async function joinGame() {
      try {
        const snap = await getDoc(gameDocRef);
        if (!snap.exists()) {
          await setDoc(gameDocRef, {
            board: Array(9).fill(""),
            currentPlayer: "X",
            winner: "",
            players: { X: { uid: user.uid, displayName: user.displayName }, O: null }
          });
          setPlayerSymbol("X");
        } else {
          const data = snap.data();
          if (!data.players.O && data.players.X?.uid !== user.uid) {
            await updateDoc(gameDocRef, { "players.O": { uid: user.uid, displayName: user.displayName } });
            setPlayerSymbol("O");
          } else if (data.players.X?.uid === user.uid) {
            setPlayerSymbol("X");
          } else if (data.players.O?.uid === user.uid) {
            setPlayerSymbol("O");
          } else {
            // Spectator
          }
        }
      } catch (e) {
        setError("Failed to join game: " + e.message);
        setLoading(false);
      }
    }
    joinGame();
  }, [gameId, user]);

  // Listen for game state
  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
        if (!data.winner) {
          setOnEndCalled(false); // Reset when game is reset
        }
        setLoading(false);
      } else {
        // Game creating...
      }
    }, (e) => {
        setError("Game sync error: " + e.message);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [gameId]);

  // Effect to call onEnd when game is over
  useEffect(() => {
    if (gameState?.winner && onEnd && !onEndCalled) {
      let finalScore = 0;
      if (gameState.winner === 'draw') {
        finalScore = 5;
      } else if (gameState.winner === playerSymbol) {
        finalScore = 10; // win
      } else {
        finalScore = 2; // loss
      }
      
      if (playerSymbol) { // only call onEnd for players, not spectators
        onEnd({ score: finalScore });
        setOnEndCalled(true);
      }
    }
  }, [gameState, onEnd, onEndCalled, playerSymbol]);

  function calculateWinner(bd) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of lines) {
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) return bd[a];
    }
    if (bd.every(cell => cell)) return "draw";
    return "";
  }

  async function handleClick(idx) {
    if (gameState.board[idx] !== "" || gameState.winner !== "" || gameState.currentPlayer !== playerSymbol) return;
    const newBoard = [...gameState.board];
    newBoard[idx] = playerSymbol;
    const newWinner = calculateWinner(newBoard);
    const nextPlayer = (playerSymbol === "X") ? "O" : "X";
    try {
      await updateDoc(gameDocRef, {
        board: newBoard,
        currentPlayer: newWinner ? "" : nextPlayer,
        winner: newWinner
      });
    } catch (e) {
      setError("Move failed: " + e.message);
    }
  }

  async function handleReset() {
    try {
      await updateDoc(gameDocRef, {
        board: Array(9).fill(""),
        currentPlayer: "X",
        winner: ""
      });
    } catch (e) {
      setError("Reset failed: " + e.message);
    }
  }

  if (loading) return <p>Loading game...</p>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!gameState) return <p className="text-red-500">Game not found or failed to load.</p>;
  
  const { board, currentPlayer, winner, players } = gameState;

  const getStatusMessage = () => {
      if(winner) return "Game Over";
      if(!players.X || !players.O) return "Waiting for opponent...";
      return `Turn: ${currentPlayer}`;
  }

  return (
    <div>
      <h2 className="mb-2">Room: {gameId}</h2>
      <div className="grid grid-cols-2 gap-8 w-full max-w-md text-center mb-4">
          <p>X: {players.X ? players.X.displayName : "..."}</p>
          <p>O: {players.O ? players.O.displayName : "..."}</p>
      </div>
      <h3 className="mb-2 font-semibold">{getStatusMessage()}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: "8px" }}>
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            style={{ width: 80, height: 80, fontSize: 32 }}
            className="border rounded disabled:opacity-50"
            disabled={
              winner !== "" ||
              currentPlayer !== playerSymbol ||
              !playerSymbol ||
              (playerSymbol !== "X" && playerSymbol !== "O")
            }
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <div className="mt-4">
          <p className="text-xl font-bold">{winner === "draw" ? "Draw game!" : `Winner: ${winner}`}</p>
          {(playerSymbol === "X" || playerSymbol === "O") && (
            <button
              onClick={handleReset}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Reset Game
            </button>
          )}
        </div>
      )}
    </div>
  );
}

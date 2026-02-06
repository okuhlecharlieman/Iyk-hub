// components/games/XOGame.jsx
// Multiplayer TicTacToe with Firestore sync

"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

export default function XOGame({ gameId, onEnd }) {
  const { user } = useAuth();
  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState("");
  const [players, setPlayers] = useState({ X: "", O: "" });
  const [playerSymbol, setPlayerSymbol] = useState("");
  const [status, setStatus] = useState("Joining game...");
  const [error, setError] = useState("");
  const [onEndCalled, setOnEndCalled] = useState(false);
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
            board: Array(9).fill(""),
            currentPlayer: "X",
            winner: "",
            players: { X: user.uid, O: "" }
          });
          setPlayerSymbol("X");
          setStatus("You are X. Waiting for O...");
        } else {
          const data = snap.data();
          if (!data.players.O && data.players.X !== user.uid) {
            await updateDoc(gameDocRef, { "players.O": user.uid });
            setPlayerSymbol("O");
            setStatus("You are O. Game on!");
          } else if (data.players.X === user.uid) {
            setPlayerSymbol("X");
            setStatus("You are X.");
          } else if (data.players.O === user.uid) {
            setPlayerSymbol("O");
            setStatus("You are O.");
          } else {
            setStatus("Room full. Spectating.");
          }
        }
      } catch (e) {
        setError("Failed to join game: " + e.message);
      }
    }
    joinGame();
    // eslint-disable-next-line
  }, [gameId, user]);

  // Listen for game state
  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setWinner(data.winner || "");
        if (!data.winner) {
          setOnEndCalled(false); // Reset when game is reset
        }
        setPlayers(data.players || { X: "", O: "" });
      }
    }, (e) => setError("Game sync error: " + e.message));
    return () => unsubscribe();
  }, [gameId]);

  // Effect to call onEnd when game is over
  useEffect(() => {
    if (winner && onEnd && !onEndCalled) {
      let finalScore = 0;
      if (winner === 'draw') {
        finalScore = 5;
      } else if (winner === playerSymbol) {
        finalScore = 10; // win
      } else {
        finalScore = 2; // loss
      }
      
      if (playerSymbol) { // only call onEnd for players, not spectators
        onEnd({ score: finalScore });
        setOnEndCalled(true);
      }
    }
  }, [winner, onEnd, onEndCalled, playerSymbol]);

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
    if (board[idx] !== "" || winner !== "" || currentPlayer !== playerSymbol) return;
    const newBoard = [...board];
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

  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="mb-2">Room: {gameId}</h2>
      <p className="mb-2">{status}</p>
      <p className="mb-2">X: {players.X ? players.X.substring(0,5) : "Waiting..."}</p>
      <p className="mb-2">O: {players.O ? players.O.substring(0,5) : "Waiting..."}</p>
      <h3 className="mb-2">Turn: {currentPlayer || "Game Over"}</h3>
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

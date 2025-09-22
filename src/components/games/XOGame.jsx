// components/games/XOGame.jsx
//
// Component: XOGame
//

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export default function XOGame({ gameId, playerSymbol }) {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState("");
  const gameDocRef = doc(db, "games", gameId);

  useEffect(() => {
    const unsubscribe = onSnapshot(gameDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setWinner(data.winner || "");
      }
    });
    return () => unsubscribe();
  }, [gameDocRef]);

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

    await updateDoc(gameDocRef, {
      board: newBoard,
      currentPlayer: newWinner ? "" : nextPlayer,
      winner: newWinner
    });
  }

  return (
    <div>
      <h2>Turn: {currentPlayer || "Game Over"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: "8px" }}>
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            style={{ width: 80, height: 80, fontSize: 32 }}
            disabled={winner !== "" || currentPlayer !== playerSymbol}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && <p>{winner === "draw" ? "Draw game!" : `Winner: ${winner}`}</p>}
    </div>
  );
}

// app/games/page.jsx
//
// Games list and creation page
//

"use client";

import Link from "next/link";
import { useState } from "react";
import { useGamesList } from "@/hooks/useGamesList";
import { createGame } from "@/lib/firebaseHelpers";
import { useAuth } from "@/context/AuthContext";

export default function GamesPage() {
  const games = useGamesList();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleNewGame = async () => {
    if (!user) return alert("Login to create a game");
    setCreating(true);
    const newGameId = await createGame(user.uid);
    setCreating(false);
    window.location.href = `/games/${newGameId}`;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Available Games</h1>
      <button
        onClick={handleNewGame}
        disabled={creating}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {creating ? "Creating..." : "New Game"}
      </button>
      <ul>
        {games.length === 0 && <li>No games found</li>}
        {games.map(({ id }) => (
          <li key={id}>
            <Link href={`/games/${id}`} className="text-blue-600 hover:underline">
              Game ID: {id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

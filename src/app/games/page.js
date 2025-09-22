// app/games/page.jsx
//
// Component: GamesPage
//

"use client";

import Link from "next/link";
import { useGamesList } from "@/hooks/useGamesList";
import { createGame } from "@/lib/firebaseHelpers";
import { useState } from "react";

export default function GamesPage() {
  const games = useGamesList();
  const [loading, setLoading] = useState(false);

  const handleNewGame = async () => {
    setLoading(true);
    const newGameId = await createGame("user1"); // Replace with authenticated user ID
    setLoading(false);
    window.location.href = `/games/${newGameId}`;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Available Games</h1>
      <button
        onClick={handleNewGame}
        disabled={loading}
        className="mb-6 p-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Creating..." : "New Game"}
      </button>

      <ul className="space-y-2">
        {games.length === 0 && <li>No games found.</li>}
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

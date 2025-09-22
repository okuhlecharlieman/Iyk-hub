// app/games/page.jsx
//
// Component: GamesPage
//

import Link from "next/link";

export default function GamesPage() {
  // Example static list; replace with fetched games from Firestore if needed
  const gameList = [
    { id: "game1", name: "Game 1" },
    { id: "game2", name: "Game 2" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Available Games</h1>
      <ul className="space-y-3">
        {gameList.map((game) => (
          <li key={game.id}>
            <Link 
              href={`/games/${game.id}`}
              className="text-blue-600 hover:underline"
            >
              {game.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

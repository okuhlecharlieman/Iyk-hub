// app/games/page.jsx
//
// Component: GamesPage
//

import Link from 'next/link';

export default function GamesPage() {
  // For demo, static game IDs or fetch real ones from db
  const gameList = [
    { id: 'game1', name: 'Game 1' },
    { id: 'game2', name: 'Game 2' },
  ];

  return (
    <div>
      <h1>Games</h1>
      <ul>
        {gameList.map(game => (
          <li key={game.id}>
            <Link href={`/games/${game.id}`}>{game.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

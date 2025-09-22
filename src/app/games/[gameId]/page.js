// app/games/[gameId]/page.jsx
//
// Component: GamePage
//

import XOGame from "@/components/games/XOGame";

// Replace this with your auth user ID logic or pass as prop/context
const currentUserId = "user1";

export default function GamePage({ params }) {
  const { gameId } = params;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-4">Game ID: {gameId}</h1>
      <XOGame gameId={gameId} currentUserId={currentUserId} />
    </div>
  );
}

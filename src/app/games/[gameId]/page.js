// app/games/[gameId]/page.jsx
//
// Dynamic game page for playing XO Game
//

import XOGame from "@/components/games/XOGame";
import { useAuth } from "@/context/AuthContext";

export default function GamePage({ params }) {
  const { gameId } = params;
  const { user } = useAuth();
  const currentUserId = user?.uid || "guest";

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Playing Game ID: {gameId}</h1>
      <XOGame gameId={gameId} currentUserId={currentUserId} />
    </div>
  );
}

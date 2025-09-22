// hooks/useGamesList.js
//
// React hook for real-time subscription to list of games in Firestore
//

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useGamesList() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesList = [];
      querySnapshot.forEach((doc) => {
        gamesList.push({ id: doc.id, ...doc.data() });
      });
      setGames(gamesList);
    });

    return () => unsubscribe();
  }, []);

  return games;
}

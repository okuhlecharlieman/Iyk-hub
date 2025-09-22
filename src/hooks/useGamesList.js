// hooks/useGamesList.js
//
// React hook to subscribe to real-time games list from Firestore
//

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useGamesList() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setGames(list);
    });

    return () => unsubscribe();
  }, []);

  return games;
}

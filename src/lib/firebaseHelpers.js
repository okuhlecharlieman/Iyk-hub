// lib/firebaseHelpers.js
//
// Firestore helpers: create and manage games
//

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createGame(playerId) {
  const docRef = await addDoc(collection(db, "games"), {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: "",
    players: [{ id: playerId }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

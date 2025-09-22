// lib/firebaseHelpers.js
//
// Functions to create and manage games in Firestore
//

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createGame(playerId) {
  const gameRef = await addDoc(collection(db, "games"), {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: "",
    players: [{ id: playerId }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return gameRef.id;
}

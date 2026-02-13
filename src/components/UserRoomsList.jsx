'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { FaPlay, FaTrash } from 'react-icons/fa';

const GAME_NAMES = {
  rps: 'Rock-Paper-Scissors',
  tictactoe: 'Tic-Tac-Toe',
  memory: 'Memory Match',
  hangman: 'Hangman',
  quiz: 'Quiz',
};

export default function UserRoomsList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      setLoading(true);
      try {
        const q1 = query(collection(db, 'games'), where('players.player1.uid', '==', user.uid));
        const q2 = query(collection(db, 'games'), where('players.player2.uid', '==', user.uid));

        const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const userRooms = [];
        const roomIds = new Set();

        querySnapshot1.forEach((doc) => {
          if (!roomIds.has(doc.id)) {
            userRooms.push({ id: doc.id, ...doc.data() });
            roomIds.add(doc.id);
          }
        });

        querySnapshot2.forEach((doc) => {
          if (!roomIds.has(doc.id)) {
            userRooms.push({ id: doc.id, ...doc.data() });
            roomIds.add(doc.id);
          }
        });

        setRooms(userRooms);
      } catch (error) {
        console.error("Error fetching user rooms:", error);
      }
      setLoading(false);
    };

    fetchRooms();
  }, [user]);

  const leaveRoom = async (gameId) => {
    if (!user) return;
    try {
      const gameDocRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameDocRef);
      if (!gameDoc.exists()) return;

      const gameData = gameDoc.data();
      const player1 = gameData.players.player1;
      const player2 = gameData.players.player2;

      if (player1 && player1.uid === user.uid) {
        await updateDoc(gameDocRef, { 'players.player1': null });
      } else if (player2 && player2.uid === user.uid) {
        await updateDoc(gameDocRef, { 'players.player2': null });
      }

      setRooms(rooms.filter(room => room.id !== gameId));
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  if (loading) {
    return <p>Loading your rooms...</p>;
  }

  if (!user || rooms.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Your Active Rooms</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {rooms.map(room => {
            const baseGameId = room.id.split('-')[0];
            const gameName = GAME_NAMES[baseGameId] || 'Unknown Game';

            return (
                <div key={room.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div>
                        <p className="font-semibold text-lg text-gray-800 dark:text-gray-100">{gameName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Room ID: {room.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href={`/games/${room.id}`}>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                                <FaPlay />
                                Join
                            </button>
                        </Link>
                        <button onClick={() => leaveRoom(room.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                            <FaTrash />
                            Leave
                        </button>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}

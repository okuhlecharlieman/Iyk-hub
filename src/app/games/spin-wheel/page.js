/**
 * Daily Scratch Card page — replaces the spin wheel.
 * Accessible from the games list. Provides a daily free scratch card
 * where players reveal symbols and earn points for matches.
 */
'use client';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ScratchCardGame from '../../../components/games/ScratchCardGame';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { GiTicket } from 'react-icons/gi';

/** ScratchCardPage — main page component. */
export default function ScratchCardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:py-8 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/games" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-medium">
              <FaArrowLeft className="mr-2" />
              Back to Games
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-3 text-white shadow-lg">
                  <GiTicket className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Daily Scratch Card
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Scratch all cells to reveal symbols — match 3+ to win points!
              </p>
            </div>
            <ScratchCardGame />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

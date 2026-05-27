'use client';
import ProtectedRoute from '../../../components/ProtectedRoute';
import SpinWheelGame from '../../../components/games/SpinWheelGame';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { GiCartwheel } from 'react-icons/gi';

export default function SpinWheelPage() {
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
                  <GiCartwheel className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Daily Spin the Wheel
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                One free spin every 24 hours — win up to 50 points!
              </p>
            </div>
            <SpinWheelGame />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

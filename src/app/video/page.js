'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import VideoChat from '../../components/VideoChat';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaVideo } from 'react-icons/fa';

export default function VideoPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                    <FaVideo className="h-6 w-6" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">Video Chat</h1>
                <p className="text-purple-100 mt-2 text-lg">Connect and chat with the community in real-time</p>
              </div>
            </div>
            
            {/* Video Chat Component */}
            <div className="p-4 sm:p-6 lg:p-8">
              <VideoChat />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

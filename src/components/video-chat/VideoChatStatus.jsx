'use client';
import { FaVideo, FaSpinner, FaUserPlus, FaClock, FaUser } from 'react-icons/fa';
import Button from '../ui/Button';

export function IdleView({ initialTimeLimit, onFindPartner }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-2">
        <FaVideo className="h-10 w-10 text-purple-500" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        Press the button to find someone to chat with. Each call has a {Math.floor(initialTimeLimit / 60)}-minute time limit. Share your profile to get an extra minute!
      </p>
      <Button onClick={onFindPartner} variant="primary" className="px-10 py-3 text-lg">
        Find someone
      </Button>
    </div>
  );
}

export function SearchingView({ localVideoRef, localStream, onStop }) {
  return (
    <div className="text-center py-8 space-y-4">
      <FaSpinner className="h-10 w-10 text-purple-500 mx-auto animate-spin" />
      <p className="text-gray-600 dark:text-gray-400 text-lg">Looking for a partner...</p>
      <p className="text-sm text-gray-500 dark:text-gray-500">This may take a few seconds.</p>

      {localStream && (
        <div className="max-w-sm mx-auto mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your camera preview</p>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
          </div>
        </div>
      )}

      <Button onClick={onStop} variant="danger" className="px-8 py-2.5 mt-4">
        Cancel
      </Button>
    </div>
  );
}

export function MediaErrorBanner({ mediaError }) {
  if (!mediaError) return null;
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-center">
      <p className="font-medium">{mediaError}</p>
      {mediaError.includes('denied') && (
        <div className="mt-3 text-sm space-y-2">
          <p className="text-gray-600 dark:text-gray-400">To re-enable camera/microphone access:</p>
          <ol className="text-left max-w-sm mx-auto text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Click the lock/camera icon in the address bar</li>
            <li>Find Camera and Microphone permissions</li>
            <li>Change both from &quot;Block&quot; to &quot;Allow&quot;</li>
            <li>Refresh the page</li>
          </ol>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
}

export function TimerBar({ timeLeft, formatTime, partnerName, canShareProfile, youConsented, onAllowShare }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <FaClock className={`${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
        <span className={`font-mono font-bold text-lg ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      {partnerName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FaUser className="text-blue-500" />
          <span className="font-medium">{partnerName}</span>
        </div>
      )}
      {!canShareProfile && (
        <Button onClick={onAllowShare} size="sm" variant="primary" disabled={youConsented}>
          <FaUserPlus className="mr-1" />
          {youConsented ? 'Waiting...' : 'Share Profile'}
        </Button>
      )}
      {canShareProfile && !partnerName && (
        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Profiles shared!</span>
      )}
    </div>
  );
}

export function ShareProfilePrompt({ canShareProfile, youConsented, onAllowShare }) {
  if (canShareProfile) return null;
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
        <FaUserPlus className="inline mr-1" />
        {youConsented
          ? 'Waiting for your partner to share their profile...'
          : 'Share your profile to reveal names and get +1 minute!'}
      </p>
      {!youConsented && (
        <Button onClick={onAllowShare} variant="primary" size="sm">
          Share My Profile
        </Button>
      )}
    </div>
  );
}

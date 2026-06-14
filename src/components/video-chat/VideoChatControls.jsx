'use client';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaStepForward, FaExpand, FaCompress } from 'react-icons/fa';

export default function VideoChatControls({ videoEnabled, audioEnabled, isFullscreen, onToggleVideo, onToggleAudio, onStop, onSkip, onToggleFullscreen }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-colors shadow-lg ${videoEnabled ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'}`}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
      </button>
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full transition-colors shadow-lg ${audioEnabled ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'}`}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
      </button>
      <button
        onClick={onStop}
        className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
        title="End call"
      >
        <FaPhoneSlash />
      </button>
      <button
        onClick={onSkip}
        className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg"
        title="Skip"
      >
        <FaStepForward />
      </button>
      <button
        onClick={onToggleFullscreen}
        className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors shadow-lg"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <FaCompress /> : <FaExpand />}
      </button>
    </div>
  );
}

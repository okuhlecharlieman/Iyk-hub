'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/ToastProvider';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  limit,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import Button from './ui/Button';
import { FaSpinner, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaUserPlus, FaClock, FaUser, FaExpand, FaCompress } from 'react-icons/fa';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const INITIAL_TIME_LIMIT = 60;
const BONUS_TIME = 60;

const createPeerConnection = (onTrack, onIceCandidate) => {
  const pc = new RTCPeerConnection(STUN_SERVERS);
  pc.ontrack = (event) => {
    onTrack(event.streams[0]);
  };
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };
  return pc;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function VideoChat() {
  const { user, userProfile } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const [youConsented, setYouConsented] = useState(false);
  const [partnerName, setPartnerName] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_LIMIT);
  const [bonusAdded, setBonusAdded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRefRef = useRef(null);
  const listenersRef = useRef([]);
  const statusRef = useRef(status);
  const timerRef = useRef(null);
  const timeLeftRef = useRef(timeLeft);
  const autoRematchRef = useRef(false);
  const searchRetryRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const canShareProfile = partnerConsented && youConsented;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next === 10) {
          toast('warning', '10 seconds remaining!');
        }
        if (next <= 0) {
          clearTimer();
          toast('info', 'Time is up! Looking for a new match...');
          autoRematchRef.current = true;
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [clearTimer, toast]);

  const cleanup = useCallback(async (isInitiator) => {
    clearTimer();
    if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
    listenersRef.current.forEach(unsubscribe => unsubscribe());
    listenersRef.current = [];

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (roomRefRef.current) {
      try {
        const roomDoc = await getDoc(roomRefRef.current);
        if (roomDoc.exists()) {
          await updateDoc(roomRefRef.current, { status: 'ended' });
          if (isInitiator) {
            setTimeout(async () => {
              try { await deleteDoc(roomRefRef.current); } catch {}
            }, 2000);
          }
        }
      } catch (error) {
        console.error("Error cleaning up room", error);
      }
    }

    roomRefRef.current = null;
  }, [clearTimer]);

  const stopCall = useCallback(async () => {
    let isInitiator = true;
    if (roomRefRef.current && statusRef.current === 'connected') {
      try {
        const roomDoc = await getDoc(roomRefRef.current);
        if (roomDoc.exists()) {
          isInitiator = roomDoc.data().userA === user?.uid;
        }
      } catch {}
    }
    await cleanup(isInitiator);
    setStatus('idle');
    setRoomId(null);
    setPartnerId(null);
    setPartnerName(null);
    setYouConsented(false);
    setPartnerConsented(false);
    setMediaError(null);
    setTimeLeft(INITIAL_TIME_LIMIT);
    setBonusAdded(false);
    setVideoEnabled(true);
    setAudioEnabled(true);
  }, [user, cleanup]);

  const tryMatchOrCreateRoom = useCallback(async () => {
    const q = query(collection(db, 'videoRooms'), where('status', '==', 'waiting'), limit(20));
    const querySnapshot = await getDocs(q);

    let roomToJoin = null;
    let myExistingRoom = null;

    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });

    for (const d of sortedDocs) {
      if (d.data().userA === user.uid) {
        myExistingRoom = d;
      } else {
        roomToJoin = d;
      }
    }

    if (myExistingRoom && roomToJoin) {
      if (user.uid < roomToJoin.data().userA) {
        await deleteDoc(myExistingRoom.ref);
      } else {
        await deleteDoc(roomToJoin.ref);
        roomToJoin = null;
      }
    }

    if (roomToJoin) {
      // Found a partner - stop retrying
      if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
      if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }

      const roomRef = roomToJoin.ref;
      const roomData = roomToJoin.data();
      setRoomId(roomToJoin.id);
      setPartnerId(roomData.userA);
      await updateDoc(roomRef, {
        userB: user.uid,
        status: 'connecting',
        consent: { [roomData.userA]: false, [user.uid]: false },
      });
      await setupCall(roomToJoin.id, false);
      return true;
    }

    return myExistingRoom || null;
  }, [user]);

  const findPartner = useCallback(async () => {
    if (!user) return;
    setStatus('searching');
    setMediaError(null);
    setTimeLeft(INITIAL_TIME_LIMIT);
    setBonusAdded(false);
    setPartnerName(null);
    setVideoEnabled(true);
    setAudioEnabled(true);
    toast('info', 'Looking for someone to chat with...');

    // Clear any previous search intervals
    if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }

    try {
      const result = await tryMatchOrCreateRoom();

      if (result === true) {
        // Matched immediately
        return;
      }

      if (result) {
        // We have an existing room, wait for partner
        setRoomId(result.id);
        setPartnerId(null);
        await setupCall(result.id, true);
      } else {
        // Create a new room and wait
        const roomRef = await addDoc(collection(db, 'videoRooms'), {
          userA: user.uid,
          status: 'waiting',
          createdAt: serverTimestamp(),
          consent: { [user.uid]: false },
        });
        setRoomId(roomRef.id);
        setPartnerId(null);
        await setupCall(roomRef.id, true);
      }

      // Actively poll for available partners every 5 seconds while waiting
      searchRetryRef.current = setInterval(async () => {
        if (statusRef.current !== 'searching') {
          clearInterval(searchRetryRef.current);
          searchRetryRef.current = null;
          return;
        }
        try {
          const matched = await tryMatchOrCreateRoom();
          if (matched === true) {
            // Found a match via retry
          }
        } catch {
          // Retry silently
        }
      }, 5000);

      // Auto-cancel search after 60 seconds if no match
      searchTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'searching') {
          if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
          toast('info', 'No one available right now. Try again later!');
          stopCall();
        }
      }, 60000);

    } catch (err) {
      console.error('Error finding partner:', err);
      const msg = err?.code === 'failed-precondition'
        ? 'Video chat requires a database index. Please contact the admin.'
        : err?.code === 'permission-denied'
          ? 'You do not have permission to use video chat. Please log in again.'
          : `Failed to connect: ${err?.message || 'Unknown error'}. Please try again.`;
      setMediaError(msg);
      setStatus('idle');
      toast('error', 'Failed to connect. Please try again.');
    }
  }, [user, toast, tryMatchOrCreateRoom, stopCall]);

  // Auto-rematch when timer expires
  useEffect(() => {
    if (timeLeft === 0 && status === 'connected') {
      const doRematch = async () => {
        await stopCall();
        setTimeout(() => {
          findPartner();
        }, 500);
      };
      doRematch();
    }
  }, [timeLeft, status, stopCall, findPartner]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (statusRef.current !== 'idle') {
        cleanup(false);
      }
    };
  }, [cleanup, clearTimer]);

  const setupCall = async (currentRoomId, isCaller) => {
    const roomRef = doc(db, 'videoRooms', currentRoomId);
    roomRefRef.current = roomRef;

    const pc = createPeerConnection(
      (stream) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream; },
      (candidate) => { addDoc(collection(roomRef, 'signals'), { from: user.uid, type: 'candidate', candidate: candidate.toJSON() }); }
    );
    pcRef.current = pc;

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera/microphone access was denied. Please allow access in your browser settings.'
        : err.name === 'NotFoundError'
          ? 'No camera or microphone found. Please connect a device.'
          : `Could not access camera/microphone: ${err.message}`;
      setMediaError(errorMsg);
      setStatus('idle');
      toast('error', errorMsg);
      if (isCaller && roomRefRef.current) {
        try { await deleteDoc(roomRefRef.current); } catch {}
      }
      roomRefRef.current = null;
      return;
    }

    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (pipVideoRef.current) pipVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    const roomUnsub = onSnapshot(roomRef, async (snap) => {
      const data = snap.data();
      if (!snap.exists() || !data) {
        if (statusRef.current !== 'idle') {
          toast('info', 'Partner disconnected. Looking for a new match...');
          await stopCall();
          setTimeout(() => findPartner(), 500);
        }
        return;
      }

      if (data.status === 'ended' && statusRef.current === 'connected') {
        toast('info', 'Partner left the call. Looking for a new match...');
        await stopCall();
        setTimeout(() => findPartner(), 500);
        return;
      }

      if (data.status === 'connected' && statusRef.current !== 'connected') {
        setStatus('connected');
        toast('success', 'Connected! You have 1 minute.');
        startTimer();
      }
      if (isCaller && data.userB && !partnerId) {
        setPartnerId(data.userB);
        await updateDoc(roomRef, { status: 'connected' });
      }

      const consentMap = data.consent || {};
      const currentPartnerId = isCaller ? data.userB : data.userA;
      setYouConsented(Boolean(consentMap[user.uid]));
      if (currentPartnerId) setPartnerConsented(Boolean(consentMap[currentPartnerId]));

      // Show partner name when both consent
      const profileMap = data.profiles || {};
      if (currentPartnerId && consentMap[user.uid] && consentMap[currentPartnerId]) {
        const pName = profileMap[currentPartnerId]?.displayName;
        if (pName) setPartnerName(pName);
      }
    });
    listenersRef.current.push(roomUnsub);

    const signalsUnsub = onSnapshot(query(collection(roomRef, 'signals'), where('from', '!=', user.uid)), async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data();
          try {
            if (data.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await addDoc(collection(roomRef, 'signals'), { from: user.uid, type: 'answer', answer: pc.localDescription.toJSON() });
            }
            if (data.type === 'answer' && isCaller) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            if (data.type === 'candidate') {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          } catch (err) {
            console.error('WebRTC signaling error:', err);
          }
        }
      }
    });
    listenersRef.current.push(signalsUnsub);

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await addDoc(collection(roomRef, 'signals'), { from: user.uid, type: 'offer', offer: pc.localDescription.toJSON() });
    }
  };

  const allowShare = async () => {
    if (!roomRefRef.current) return;
    const myName = userProfile?.displayName || user?.displayName || 'Anonymous';
    await updateDoc(roomRefRef.current, {
      [`consent.${user.uid}`]: true,
      [`profiles.${user.uid}`]: { displayName: myName },
    });
    setYouConsented(true);
    toast('info', 'Profile shared! Waiting for partner...');

    // Add bonus time when both consent
    const snap = await getDoc(roomRefRef.current);
    if (snap.exists()) {
      const data = snap.data();
      const currentPartnerId = data.userA === user.uid ? data.userB : data.userA;
      if (currentPartnerId && data.consent?.[currentPartnerId]) {
        if (!bonusAdded) {
          setTimeLeft(prev => prev + BONUS_TIME);
          setBonusAdded(true);
          toast('success', `Profiles revealed! +${BONUS_TIME}s added.`);
          const pName = data.profiles?.[currentPartnerId]?.displayName;
          if (pName) setPartnerName(pName);
        }
      }
    }
  };

  // Listen for partner consent to add bonus time
  useEffect(() => {
    if (canShareProfile && !bonusAdded && status === 'connected') {
      setTimeLeft(prev => prev + BONUS_TIME);
      setBonusAdded(true);
      toast('success', `Profiles revealed! +${BONUS_TIME}s added.`);
    }
  }, [canShareProfile, bonusAdded, status, toast]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const toggleFullscreen = async () => {
    try {
      if (isIOS) {
        // iOS Safari: use webkitEnterFullscreen on the remote video element
        const vid = remoteVideoRef.current;
        if (vid && typeof vid.webkitEnterFullscreen === 'function') {
          // Ensure video has playsinline attribute set for iOS
          vid.setAttribute('playsinline', '');
          vid.setAttribute('webkit-playsinline', '');
          vid.webkitEnterFullscreen();
          return;
        }
        // Fallback: toggle CSS-based fullscreen for iOS
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setIsFullscreen(true);
        }
        return;
      }

      const el = videoContainerRef.current;
      if (!el) return;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Keep PiP video in sync with local stream when connected
  useEffect(() => {
    if (status === 'connected' && localStreamRef.current && pipVideoRef.current) {
      pipVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [status]);

  return (
    <div className="space-y-6">
      {mediaError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-center">
          <p className="font-medium">{mediaError}</p>
        </div>
      )}

      {status === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-2">
            <FaVideo className="h-10 w-10 text-purple-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            Press the button to find someone to chat with. Each call has a 1-minute time limit. Share your profile to get an extra minute!
          </p>
          <Button onClick={findPartner} variant="primary" className="px-10 py-3 text-lg">
            Find someone
          </Button>
        </div>
      )}

      {(status === 'searching' || status === 'connecting') && (
        <div className="text-center py-8 space-y-4">
          <FaSpinner className="h-10 w-10 text-purple-500 mx-auto animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Looking for a partner...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">This may take a few seconds.</p>

          {localStreamRef.current && (
            <div className="max-w-sm mx-auto mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your camera preview</p>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
              </div>
            </div>
          )}

          <Button onClick={stopCall} variant="danger" className="px-8 py-2.5 mt-4">
            Cancel
          </Button>
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-4">
          {/* Timer bar */}
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
              <Button onClick={allowShare} size="sm" variant="primary" disabled={youConsented}>
                <FaUserPlus className="mr-1" />
                {youConsented ? 'Waiting...' : 'Share Profile'}
              </Button>
            )}
            {canShareProfile && !partnerName && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Profiles shared!</span>
            )}
          </div>

          {/* Video area — PiP layout */}
          <div ref={videoContainerRef} className={`relative w-full bg-black rounded-2xl overflow-hidden shadow-lg ${isFullscreen && isIOS ? 'fixed inset-0 z-50 rounded-none' : isFullscreen ? '' : 'aspect-video'}`}>
            {/* Remote video (full size) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              webkit-playsinline=""
              className={`w-full h-full object-cover ${isFullscreen ? 'absolute inset-0' : ''}`}
            />

            {/* Partner name overlay */}
            {partnerName && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
                <FaUser className="text-white text-xs" />
                <span className="text-white text-sm font-medium">{partnerName}</span>
              </div>
            )}

            {/* Timer overlay */}
            <div className={`absolute top-4 right-16 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10 ${timeLeft <= 10 ? 'bg-red-600/70' : ''}`}>
              <span className="text-white text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/70 transition-colors z-10"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>

            {/* Self video (PiP — small overlay with separate ref) */}
            <div className="absolute bottom-16 right-4 w-28 sm:w-36 md:w-44 aspect-video rounded-xl overflow-hidden shadow-xl border-2 border-white/30 z-10">
              <video
                ref={pipVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover bg-gray-900"
              />
            </div>

            {/* Controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors shadow-lg ${videoEnabled ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'}`}
                title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors shadow-lg ${audioEnabled ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'}`}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors shadow-lg"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FaCompress /> : <FaExpand />}
              </button>
              <button
                onClick={stopCall}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                title="End call"
              >
                <FaPhoneSlash />
              </button>
            </div>
          </div>

          {/* Share profile prompt (below video if not yet shared) */}
          {!canShareProfile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                <FaUserPlus className="inline mr-1" />
                {youConsented
                  ? 'Waiting for your partner to share their profile...'
                  : 'Share your profile to reveal names and get +1 minute!'}
              </p>
              {!youConsented && (
                <Button onClick={allowShare} variant="primary" size="sm">
                  Share My Profile
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

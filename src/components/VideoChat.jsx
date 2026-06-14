'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/ToastProvider';
import { useActiveBoost } from '../hooks/useActiveBoost';
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
import { FaUser, FaExpand, FaCompress } from 'react-icons/fa';
import VideoChatControls from './video-chat/VideoChatControls';
import { IdleView, SearchingView, MediaErrorBanner, TimerBar, ShareProfilePrompt } from './video-chat/VideoChatStatus';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const DEFAULT_TIME_LIMIT = 60;
const BONUS_TIME = 60;

const createPeerConnection = (onTrack, onIceCandidate) => {
  const pc = new RTCPeerConnection(STUN_SERVERS);
  pc.ontrack = (event) => { onTrack(event.streams[0]); };
  pc.onicecandidate = (event) => { if (event.candidate) onIceCandidate(event.candidate); };
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
  const { boost: activeBoost } = useActiveBoost();
  const initialTimeLimit = activeBoost?.videoChatSeconds || DEFAULT_TIME_LIMIT;
  const [status, setStatus] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const [youConsented, setYouConsented] = useState(false);
  const [partnerName, setPartnerName] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const [bonusAdded, setBonusAdded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (status === 'idle') setTimeLeft(initialTimeLimit);
  }, [initialTimeLimit, status]);

  const localVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRefRef = useRef(null);
  const listenersRef = useRef([]);
  const statusRef = useRef(status);
  const videoEnabledRef = useRef(videoEnabled);
  const timerRef = useRef(null);
  const timeLeftRef = useRef(timeLeft);
  const autoRematchRef = useRef(false);
  const searchRetryRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const canShareProfile = partnerConsented && youConsented;

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { videoEnabledRef.current = videoEnabled; }, [videoEnabled]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next === 10) toast('warning', '10 seconds remaining!');
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
      try { pcRef.current.getSenders().forEach(sender => { try { pcRef.current.removeTrack(sender); } catch {} }); } catch {}
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => { t.enabled = false; t.stop(); });
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
            setTimeout(async () => { try { await deleteDoc(roomRefRef.current); } catch {} }, 2000);
          }
        }
      } catch (error) { console.error("Error cleaning up room", error); }
    }
    roomRefRef.current = null;
  }, [clearTimer]);

  const stopCall = useCallback(async () => {
    let isInitiator = true;
    if (roomRefRef.current && statusRef.current === 'connected') {
      try {
        const roomDoc = await getDoc(roomRefRef.current);
        if (roomDoc.exists()) isInitiator = roomDoc.data().userA === user?.uid;
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
    setTimeLeft(initialTimeLimit);
    setBonusAdded(false);
    setVideoEnabled(true);
    setAudioEnabled(true);
  }, [user, cleanup, initialTimeLimit]);

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
      if (isCaller && roomRefRef.current) { try { await deleteDoc(roomRefRef.current); } catch {} }
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
        const mins = Math.floor(initialTimeLimit / 60);
        toast('success', `Connected! You have ${mins} minute${mins !== 1 ? 's' : ''}.`);
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
            if (data.type === 'answer' && isCaller) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            if (data.type === 'candidate') await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            if (!err?.message?.includes('location information') && err?.name !== 'InvalidStateError') {
              console.error('WebRTC signaling error:', err);
            }
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

  const tryMatchOrCreateRoom = useCallback(async () => {
    const q = query(collection(db, 'videoRooms'), where('status', '==', 'waiting'), limit(20));
    const querySnapshot = await getDocs(q);

    let roomToJoin = null;
    let myExistingRoom = null;
    const staleThreshold = Date.now() - 90000;

    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });

    for (const d of sortedDocs) {
      const data = d.data();
      const roomAge = data.createdAt?.toMillis?.() || 0;
      if (roomAge > 0 && roomAge < staleThreshold) continue;
      if (data.userA === user.uid) myExistingRoom = d;
      else if (!roomToJoin) roomToJoin = d;
    }

    if (myExistingRoom && roomToJoin) {
      if (user.uid > roomToJoin.data().userA) {
        await deleteDoc(myExistingRoom.ref);
        myExistingRoom = null;
      } else {
        roomToJoin = null;
      }
    }

    if (roomToJoin) {
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
    setTimeLeft(initialTimeLimit);
    setBonusAdded(false);
    setPartnerName(null);
    setVideoEnabled(true);
    setAudioEnabled(true);
    toast('info', 'Looking for someone to chat with...');

    if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }

    try {
      const result = await tryMatchOrCreateRoom();
      if (result === true) return;

      if (result) {
        setRoomId(result.id);
        setPartnerId(null);
        await setupCall(result.id, true);
      } else {
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

      searchRetryRef.current = setInterval(async () => {
        if (statusRef.current !== 'searching') {
          clearInterval(searchRetryRef.current);
          searchRetryRef.current = null;
          return;
        }
        try { await tryMatchOrCreateRoom(); } catch {}
      }, 3000);

      searchTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'searching') {
          if (searchRetryRef.current) { clearInterval(searchRetryRef.current); searchRetryRef.current = null; }
          toast('info', 'No one available right now. Try again later!');
          stopCall();
        }
      }, 90000);

    } catch (err) {
      console.error('Error finding partner:', err);
      const msg = err?.code === 'failed-precondition'
        ? 'Random chat requires a database index. Please contact the admin.'
        : err?.code === 'permission-denied'
          ? 'You do not have permission to use random chat. Please log in again.'
          : `Failed to connect: ${err?.message || 'Unknown error'}. Please try again.`;
      setMediaError(msg);
      setStatus('idle');
      toast('error', 'Failed to connect. Please try again.');
    }
  }, [user, toast, tryMatchOrCreateRoom, stopCall, initialTimeLimit]);

  useEffect(() => {
    if (timeLeft === 0 && status === 'connected') {
      const doRematch = async () => { await stopCall(); setTimeout(() => findPartner(), 500); };
      doRematch();
    }
  }, [timeLeft, status, stopCall, findPartner]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => { t.enabled = false; t.stop(); });
    };
    const handleVisibilityChange = () => {
      if (statusRef.current === 'idle' || !localStreamRef.current) return;
      if (document.visibilityState === 'hidden') {
        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = false; });
      } else if (document.visibilityState === 'visible' && videoEnabledRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = true; });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimer();
      if (statusRef.current !== 'idle') cleanup(false);
    };
  }, [cleanup, clearTimer]);

  const allowShare = async () => {
    if (!roomRefRef.current) return;
    const myName = userProfile?.displayName || user?.displayName || 'Anonymous';
    await updateDoc(roomRefRef.current, {
      [`consent.${user.uid}`]: true,
      [`profiles.${user.uid}`]: { displayName: myName },
    });
    setYouConsented(true);
    toast('info', 'Profile shared! Waiting for partner...');

    const snap = await getDoc(roomRefRef.current);
    if (snap.exists()) {
      const data = snap.data();
      const currentPartnerId = data.userA === user.uid ? data.userB : data.userA;
      if (currentPartnerId && data.consent?.[currentPartnerId] && !bonusAdded) {
        setTimeLeft(prev => prev + BONUS_TIME);
        setBonusAdded(true);
        toast('success', `Profiles revealed! +${BONUS_TIME}s added.`);
        const pName = data.profiles?.[currentPartnerId]?.displayName;
        if (pName) setPartnerName(pName);
      }
    }
  };

  const handleSkip = async () => {
    toast('info', 'Skipping to the next person...');
    await stopCall();
    setTimeout(() => findPartner(), 500);
  };

  useEffect(() => {
    if (canShareProfile && !bonusAdded && status === 'connected') {
      setTimeLeft(prev => prev + BONUS_TIME);
      setBonusAdded(true);
      toast('success', `Profiles revealed! +${BONUS_TIME}s added.`);
    }
  }, [canShareProfile, bonusAdded, status, toast]);

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setVideoEnabled(videoTrack.enabled); }
  };

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => { track.enabled = !track.enabled; });
    if (audioTracks.length > 0) setAudioEnabled(audioTracks[0].enabled);
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const toggleFullscreen = async () => {
    try {
      if (isIOS) {
        const vid = remoteVideoRef.current;
        if (vid && typeof vid.webkitEnterFullscreen === 'function') {
          vid.setAttribute('playsinline', '');
          vid.setAttribute('webkit-playsinline', '');
          vid.webkitEnterFullscreen();
          return;
        }
        setIsFullscreen(prev => !prev);
        return;
      }
      const el = videoContainerRef.current;
      if (!el) return;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (status === 'connected' && localStreamRef.current && pipVideoRef.current) {
      pipVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [status]);

  return (
    <div className="space-y-6">
      <MediaErrorBanner mediaError={mediaError} />

      {status === 'idle' && (
        <IdleView initialTimeLimit={initialTimeLimit} onFindPartner={findPartner} />
      )}

      {(status === 'searching' || status === 'connecting') && (
        <SearchingView localVideoRef={localVideoRef} localStream={localStreamRef.current} onStop={stopCall} />
      )}

      {status === 'connected' && (
        <div className="space-y-4">
          <TimerBar
            timeLeft={timeLeft}
            formatTime={formatTime}
            partnerName={partnerName}
            canShareProfile={canShareProfile}
            youConsented={youConsented}
            onAllowShare={allowShare}
          />

          <div ref={videoContainerRef} className={`relative w-full bg-black rounded-2xl overflow-hidden shadow-lg ${isFullscreen && isIOS ? 'fixed inset-0 z-[9999] rounded-none' : isFullscreen ? '' : 'aspect-video'}`} style={isFullscreen && isIOS ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
            <video ref={remoteVideoRef} autoPlay playsInline webkit-playsinline="" className={`w-full h-full object-contain ${isFullscreen ? 'absolute inset-0' : ''}`} style={isFullscreen && isIOS ? { objectFit: 'contain', width: '100%', height: '100%' } : undefined} />

            {partnerName && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
                <FaUser className="text-white text-xs" />
                <span className="text-white text-sm font-medium">{partnerName}</span>
              </div>
            )}

            <div className={`absolute top-4 right-16 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10 ${timeLeft <= 10 ? 'bg-red-600/70' : ''}`}>
              <span className="text-white text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>

            <button onClick={toggleFullscreen} className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/70 transition-colors z-10" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>

            <div className="absolute bottom-16 right-4 w-28 sm:w-36 md:w-44 aspect-video rounded-xl overflow-hidden shadow-xl border-2 border-white/30 z-10">
              <video ref={pipVideoRef} autoPlay muted playsInline className="w-full h-full object-cover bg-gray-900" />
            </div>

            <VideoChatControls
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
              isFullscreen={isFullscreen}
              onToggleVideo={toggleVideo}
              onToggleAudio={toggleAudio}
              onStop={stopCall}
              onSkip={handleSkip}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>

          <ShareProfilePrompt canShareProfile={canShareProfile} youConsented={youConsented} onAllowShare={allowShare} />
        </div>
      )}
    </div>
  );
}

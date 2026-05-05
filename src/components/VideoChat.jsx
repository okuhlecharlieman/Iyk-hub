'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
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
  orderBy,
} from 'firebase/firestore';
import Button from './ui/Button';
import { FaSpinner, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

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

export default function VideoChat() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const [youConsented, setYouConsented] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRefRef = useRef(null);
  const listenersRef = useRef([]);
  const statusRef = useRef(status);

  const canShareProfile = partnerConsented && youConsented;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanup = useCallback(async (isInitiator) => {
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
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (isInitiator && roomRefRef.current) {
      try {
        const roomDoc = await getDoc(roomRefRef.current);
        if (roomDoc.exists()) {
          await deleteDoc(roomRefRef.current);
        }
      } catch (error) {
        console.error("Error cleaning up room", error);
      }
    }

    roomRefRef.current = null;
  }, []);

  const stopCall = useCallback(async () => {
    let isInitiator = true;
    if (roomRefRef.current && statusRef.current === 'connected') {
      try {
        const roomDoc = await getDoc(roomRefRef.current);
        if (roomDoc.exists()) {
          isInitiator = roomDoc.data().userA === user?.uid;
        }
      } catch {
        // If we can't read the doc, default to initiator for cleanup
      }
    }
    await cleanup(isInitiator);
    setStatus('idle');
    setRoomId(null);
    setPartnerId(null);
    setYouConsented(false);
    setPartnerConsented(false);
    setMediaError(null);
  }, [user, cleanup]);

  useEffect(() => {
    return () => {
      if (statusRef.current !== 'idle') {
        cleanup(false);
      }
    };
  }, [cleanup]);

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
      if (isCaller && roomRefRef.current) {
        try { await deleteDoc(roomRefRef.current); } catch {}
      }
      roomRefRef.current = null;
      return;
    }

    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    const roomUnsub = onSnapshot(roomRef, async (snap) => {
      const data = snap.data();
      if (!snap.exists() || !data) {
        if (statusRef.current !== 'idle') {
          stopCall();
        }
        return;
      }
      if (data.status === 'connected' && statusRef.current !== 'connected') {
        setStatus('connected');
      }
      if (isCaller && data.userB && !partnerId) {
        setPartnerId(data.userB);
        await updateDoc(roomRef, { status: 'connected' });
      }

      const consentMap = data.consent || {};
      const currentPartnerId = isCaller ? data.userB : data.userA;
      setYouConsented(Boolean(consentMap[user.uid]));
      if (currentPartnerId) setPartnerConsented(Boolean(consentMap[currentPartnerId]));
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

  const findPartner = async () => {
    if (!user) return;
    setStatus('searching');
    setMediaError(null);

    try {
      const q = query(collection(db, 'videoRooms'), where('status', '==', 'waiting'), orderBy('createdAt'));
      const querySnapshot = await getDocs(q);

      let roomToJoin = null;
      let myExistingRoom = null;

      for (const d of querySnapshot.docs) {
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
      } else if (myExistingRoom) {
        setRoomId(myExistingRoom.id);
        setPartnerId(null);
        await setupCall(myExistingRoom.id, true);
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
    } catch (err) {
      console.error('Error finding partner:', err);
      setMediaError('Failed to connect. Please try again.');
      setStatus('idle');
    }
  };

  const allowShare = async () => {
    if (!roomRefRef.current) return;
    await updateDoc(roomRefRef.current, { [`consent.${user.uid}`]: true });
    setYouConsented(true);
  };

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
            Press the button to find someone to chat with. Nothing is shared until both agree.
          </p>
          <Button onClick={findPartner} variant="primary" className="px-10 py-3 text-lg">
            Find someone
          </Button>
        </div>
      )}

      {(status === 'searching' || status === 'connecting') && (
        <div className="text-center py-8 space-y-4">
          <FaSpinner className="h-10 w-10 text-purple-500 mx-auto animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Looking for a partner…</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">This may take a few seconds.</p>

          {localStreamRef.current && (
            <div className="max-w-sm mx-auto mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your camera preview</p>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">You</h3>
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
              <div className="flex justify-center gap-3 mt-3">
                <button
                  onClick={toggleVideo}
                  className={`p-2.5 rounded-full transition-colors ${videoEnabled ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}
                  title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
                </button>
                <button
                  onClick={toggleAudio}
                  className={`p-2.5 rounded-full transition-colors ${audioEnabled ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}
                  title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Partner</h3>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-black aspect-video" />
              <div className="mt-4">
                {canShareProfile ? (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/50">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Profile shared!</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Profile will be revealed when both of you agree.
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Button onClick={allowShare} variant="primary" className="flex-1" disabled={youConsented}>
                        {youConsented ? 'Waiting for partner...' : 'Share my profile'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div className="text-center">
          <Button onClick={stopCall} variant="danger" className="px-10 py-3">
            {status === 'connected' ? 'End Call' : 'Cancel'}
          </Button>
        </div>
      )}
    </div>
  );
}

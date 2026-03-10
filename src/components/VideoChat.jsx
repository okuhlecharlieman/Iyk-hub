'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'firebase/firestore';
import Button from './ui/Button';

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
  const [status, setStatus] = useState('idle'); // idle, searching, connecting, connected
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const [youConsented, setYouConsented] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRefRef = useRef(null);
  const signalsListenerRef = useRef(null);
  const roomListenerRef = useRef(null);

  const canShareProfile = partnerConsented && youConsented;

  const allowShare = async () => {
    if (!roomRefRef.current || !user) return;
    const roomRef = roomRefRef.current;

    await updateDoc(roomRef, {
      [`consent.${user.uid}`]: true,
    });
    setYouConsented(true);
  };

  const getPartnerProfile = async () => {
    if (!partnerId) return null;
    const userDocRef = doc(db, 'users', partnerId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data() : null;
  };

  const stopCall = async () => {
    setStatus('idle');
    setRoomId(null);
    setPartnerId(null);
    setPartnerConsented(false);
    setYouConsented(false);

    if (signalsListenerRef.current) {
      signalsListenerRef.current();
      signalsListenerRef.current = null;
    }
    if (roomListenerRef.current) {
      roomListenerRef.current();
      roomListenerRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (roomRefRef.current) {
      try {
        const roomDoc = await roomRefRef.current.get();
        if (roomDoc.exists) {
          await deleteDoc(roomRefRef.current);
        }
      } catch (e) {
        // ignore
      }
    }

    roomRefRef.current = null;
  };

  const setupCall = async (roomId, isCaller) => {
    if (!user) return;

    const pc = createPeerConnection(
      (stream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      },
      async (candidate) => {
        if (!roomRefRef.current) return;
        await addDoc(collection(roomRefRef.current, 'signals'), {
          from: user.uid,
          type: 'candidate',
          candidate: candidate.toJSON(),
          createdAt: serverTimestamp(),
        });
      }
    );

    pcRef.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const roomRef = doc(db, 'videoRooms', roomId);
    roomRefRef.current = roomRef;

    const signalsCol = collection(roomRef, 'signals');
    signalsListenerRef.current = onSnapshot(signalsCol, async (snapshot) => {
      for (const docSnap of snapshot.docChanges()) {
        if (docSnap.type !== 'added') continue;
        const data = docSnap.doc.data();
        if (data.from === user.uid) continue;

        if (data.type === 'offer') {
          await pc.setRemoteDescription(data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await addDoc(signalsCol, {
            from: user.uid,
            type: 'answer',
            answer: pc.localDescription.toJSON(),
            createdAt: serverTimestamp(),
          });
        }

        if (data.type === 'answer' && isCaller) {
          await pc.setRemoteDescription(data.answer);
        }

        if (data.type === 'candidate') {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (e) {
            console.warn('Failed to add ICE candidate', e);
          }
        }
      }
    });

    roomListenerRef.current = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (data.status === 'connected') {
        setStatus('connected');
      }

      const consentMap = data.consent || {};
      setYouConsented(Boolean(consentMap[user.uid]));
      setPartnerConsented(Boolean(consentMap[partnerId]));
    });

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateDoc(roomRef, {
        offer: pc.localDescription.toJSON(), // FIX: Use pc.localDescription
        status: 'connecting',
      });
    }
  };

  const findPartner = async () => {
    if (!user) return;

    setStatus('searching');

    // Try to find an existing waiting room
    const waitingQuery = query(
      collection(db, 'videoRooms'),
      where('status', '==', 'waiting'),
      limit(1)
    );

    const snap = await getDocs(waitingQuery);
    if (!snap.empty) {
      const roomDoc = snap.docs[0];
      const roomData = roomDoc.data();
      const roomRef = roomDoc.ref;

      if (roomData.userA === user.uid) {
        // You are already the creator.
        setRoomId(roomDoc.id);
        setPartnerId(null);
        await setupCall(roomDoc.id, true);
        return;
      }

      // Join as userB
      setRoomId(roomDoc.id);
      setPartnerId(roomData.userA);
      await updateDoc(roomRef, {
        userB: user.uid,
        status: 'connecting',
        joinedAt: serverTimestamp(),
        'consent': { [roomData.userA]: false, [user.uid]: false },
      });

      await setupCall(roomDoc.id, false);

      // Mark connected once signal exchange begins.
      await updateDoc(roomRef, { status: 'connected' });
      return;
    }

    // Create a new waiting room
    const roomRef = await addDoc(collection(db, 'videoRooms'), {
      userA: user.uid,
      status: 'waiting',
      consent: { [user.uid]: false },
      createdAt: serverTimestamp(),
    });

    setRoomId(roomRef.id);
    setPartnerId(null);

    // Start the caller flow and wait for another user to join
    await setupCall(roomRef.id, true);

    // When someone joins, update status to connected.
    roomListenerRef.current = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      if (data.userB && data.status === 'connecting') {
        setPartnerId(data.userB);
        updateDoc(roomRef, { status: 'connected' });
      }

      const consentMap = data.consent || {};
      setYouConsented(Boolean(consentMap[user.uid]));
      setPartnerConsented(Boolean(consentMap[partnerId]));
    });
  };

  const partnerInfo = useMemo(() => {
    if (!canShareProfile || !partnerId) return null;
    return { uid: partnerId };
  }, [canShareProfile, partnerId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Random Chats</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Meet a random Intwana Hub user via video. Nothing is shared until both agree.
          </p>
        </div>

        <div className="space-y-4">
          {status === 'idle' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-600 dark:text-gray-400">Press the button to find someone to chat with.</p>
              <Button onClick={findPartner} variant="primary" className="px-10 py-3">
                Find someone
              </Button>
            </div>
          )}

          {(status === 'searching' || status === 'connecting') && (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">Looking for a partner…</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">(This may take a few seconds.)</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">You</h3>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg mt-4 bg-black" />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Partner</h3>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg mt-4 bg-black" />

                <div className="mt-4">
                  {canShareProfile ? (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/50">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Profile shared!</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">You can now see the partner’s profile.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Profile will be revealed when both of you agree.
                      </p>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Button onClick={allowShare} variant="primary" className="flex-1">
                          Share my profile
                        </Button>
                        <Button onClick={stopCall} variant="ghost" className="flex-1">
                          End call
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {canShareProfile && (
                  <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Partner ID: <span className="font-medium text-gray-900 dark:text-gray-100">{partnerId}</span></p>
                  </div>
                )}
              </div>
            </div>
          )}

          {status !== 'idle' && (
            <div className="mt-6 text-center">
              <Button onClick={stopCall} variant="danger" className="px-10 py-3">
                Stop
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  orderBy,
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
  const listenersRef = useRef([]);

  const canShareProfile = partnerConsented && youConsented;

  const cleanup = async (isInitiator) => {
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
  };

  const stopCall = async () => {
    const isInitiator = status === 'connected' ? (await getDoc(roomRefRef.current)).data().userA === user.uid : true;
    await cleanup(isInitiator);
    setStatus('idle');
    setRoomId(null);
    setPartnerId(null);
    setYouConsented(false);
    setPartnerConsented(false);
  };

  useEffect(() => {
      return () => {
          if(status !== 'idle') stopCall();
      }
  }, [status]);

  const setupCall = async (currentRoomId, isCaller) => {
    const roomRef = doc(db, 'videoRooms', currentRoomId);
    roomRefRef.current = roomRef;
    
    const pc = createPeerConnection(
        (stream) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream; },
        (candidate) => { addDoc(collection(roomRef, 'signals'), { from: user.uid, type: 'candidate', candidate: candidate.toJSON() }); }
    );
    pcRef.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    const roomUnsub = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (!snap.exists() || !data) {
            stopCall();
            return;
        }
        if (data.status === 'connected' && status !== 'connected') {
            setStatus('connected');
        }
        if (isCaller && data.userB && !partnerId) {
            setPartnerId(data.userB);
            await updateDoc(roomRef, { status: 'connected' });
        }

        const consentMap = data.consent || {};
        const currentPartnerId = isCaller ? data.userB : data.userA;
        setYouConsented(Boolean(consentMap[user.uid]));
        if(currentPartnerId) setPartnerConsented(Boolean(consentMap[currentPartnerId]));
    });
    listenersRef.current.push(roomUnsub);

    const signalsUnsub = onSnapshot(query(collection(roomRef, 'signals'), where('from', '!=', user.uid)), async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
                const data = change.doc.data();
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

    const q = query(collection(db, 'videoRooms'), where('status', '==', 'waiting'), orderBy('createdAt'));
    const querySnapshot = await getDocs(q);

    let roomToJoin = null;
    let myExistingRoom = null;

    for (const doc of querySnapshot.docs) {
        if (doc.data().userA === user.uid) {
            myExistingRoom = doc;
        } else {
            roomToJoin = doc;
        }
    }
    
    if (myExistingRoom && roomToJoin) {
        // Tie-break: user with smaller UID joins the other's room.
        if (user.uid < roomToJoin.data().userA) {
            await deleteDoc(myExistingRoom.ref); // Delete my room, join theirs
        } else {
            await deleteDoc(roomToJoin.ref); // They should join me, delete their room.
            roomToJoin = null; // Act as a caller.
        }
    }

    if (roomToJoin) {
      // Join the existing room
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
        // I have a room, wait for a partner.
        setRoomId(myExistingRoom.id);
        setPartnerId(null);
        await setupCall(myExistingRoom.id, true);
    } else {
      // Create a new room
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
  };

  const allowShare = async () => {
    if (!roomRefRef.current) return;
    await updateDoc(roomRefRef.current, { [`consent.${user.uid}`]: true });
    setYouConsented(true);
  };

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

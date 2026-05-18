import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const HEARTBEAT_INTERVAL = 60_000;
const STALE_THRESHOLD = 2 * 60_000;

let stopPresence: Unsubscribe | null = null;
let presenceUsers = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let unloadHandler: (() => void) | null = null;

function setPresenceStatus(uid: string, state: "online" | "offline") {
  if (!db) return;
  const presenceRef = doc(db, "presence", uid);
  setDoc(
    presenceRef,
    { state, lastSeen: serverTimestamp() },
    { merge: true },
  ).catch((err) => console.error("[Presence] Status write error:", err));
}

function startHeartbeat(uid: string) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    setPresenceStatus(uid, "online");
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function removeUnloadHandler() {
  if (unloadHandler && typeof window !== "undefined") {
    window.removeEventListener("beforeunload", unloadHandler);
    unloadHandler = null;
  }
}

export function startPresence(): Unsubscribe {
  presenceUsers += 1;

  if (!stopPresence && auth) {
    stopPresence = onAuthStateChanged(auth, (user) => {
      stopHeartbeat();
      removeUnloadHandler();

      if (!user) return;

      setPresenceStatus(user.uid, "online");
      startHeartbeat(user.uid);

      if (typeof window !== "undefined") {
        const handler = () => setPresenceStatus(user.uid, "offline");
        window.addEventListener("beforeunload", handler);
        unloadHandler = handler;
      }
    });
  }

  return () => {
    presenceUsers = Math.max(0, presenceUsers - 1);
    if (presenceUsers > 0 || !stopPresence) return;

    stopHeartbeat();
    removeUnloadHandler();

    if (auth?.currentUser) {
      setPresenceStatus(auth.currentUser.uid, "offline");
    }

    stopPresence();
    stopPresence = null;
  };
}

export function subscribeOnlineCount(cb: (n: number) => void): Unsubscribe {
  if (!db) {
    cb(0);
    return () => {};
  }

  const presenceRef = collection(db, "presence");
  const q = query(presenceRef, where("state", "==", "online"));

  let latestSnap: import("firebase/firestore").QuerySnapshot | null = null;

  const recount = () => {
    if (!latestSnap) return;
    const now = Date.now();
    let count = 0;
    latestSnap.forEach((d) => {
      const data = d.data();
      const lastSeen = data.lastSeen?.toMillis?.() || 0;
      if (lastSeen === 0 || now - lastSeen < STALE_THRESHOLD) {
        count++;
      }
    });
    cb(count);
  };

  const unsub = onSnapshot(
    q,
    (snap) => {
      latestSnap = snap;
      recount();
    },
    (error) => {
      console.error("[Presence] subscribeOnlineCount read failed:", error);
      cb(0);
    },
  );

  const interval = setInterval(recount, 60_000);

  return () => {
    unsub();
    clearInterval(interval);
  };
}

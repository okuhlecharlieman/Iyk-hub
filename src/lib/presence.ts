import { onAuthStateChanged, type User } from "firebase/auth";
import {
  child,
  onDisconnect,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update,
  type Unsubscribe,
} from "firebase/database";
import { auth, rtdb } from "./firebase";

type StatusRecord = {
  state?: string;
  connections?: Record<string, unknown>;
};

const ONLINE_STATE = {
  state: "online",
  last_changed: serverTimestamp(),
};

const OFFLINE_STATE = {
  state: "offline",
  last_changed: serverTimestamp(),
};

let stopPresence: Unsubscribe | null = null;
let presenceUsers = 0;
let activeConnectionCleanup: (() => void) | null = null;
let activeUserStatusRef: ReturnType<typeof ref> | null = null;

function countActiveConnections(status: StatusRecord) {
  const connections = status.connections;

  if (!connections) return status.state === "online" ? 1 : 0;

  return Object.values(connections).filter(Boolean).length;
}

function countOnlinePresence(value: unknown) {
  if (!value || typeof value !== "object") return 0;

  return countActiveConnections(value as StatusRecord);
}

function stopActiveConnection() {
  if (activeConnectionCleanup) {
    activeConnectionCleanup();
    activeConnectionCleanup = null;
  }
}

function trackUserPresence(user: User) {
  const userRef = ref(rtdb, `status/${user.uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

  return onValue(
    connectedRef,
    (snap) => {
      if (snap.val() !== true) return;

      stopActiveConnection();

      const connectionRef = push(child(userRef, "connections"));

      onDisconnect(connectionRef)
        .remove()
        .catch((err) => console.error("[Presence] Disconnect cleanup error:", err));

      onDisconnect(userRef)
        .update(OFFLINE_STATE)
        .catch((err) => console.error("[Presence] Disconnect status error:", err));

      set(connectionRef, true).catch((err) =>
        console.error("[Presence] Connection write error:", err),
      );

      update(userRef, {
        ...ONLINE_STATE,
        email: user.email || null,
      }).catch((err) => console.error("[Presence] Status write error:", err));

      activeConnectionCleanup = () => {
        set(connectionRef, null).catch((err) =>
          console.error("[Presence] Connection cleanup error:", err),
        );
      };
    },
    (error) => {
      console.error("[Presence] .info/connected listener failed:", error);
    },
  );
}

export function startPresence(): Unsubscribe {
  presenceUsers += 1;

  if (!stopPresence) {
    let unsubscribeConnected: Unsubscribe | null = null;

    stopPresence = onAuthStateChanged(auth, (user) => {
      if (unsubscribeConnected) {
        unsubscribeConnected();
        unsubscribeConnected = null;
      }

      stopActiveConnection();

      if (activeUserStatusRef) {
        update(activeUserStatusRef, OFFLINE_STATE).catch((err) =>
          console.error("[Presence] Sign-out status error:", err),
        );
        activeUserStatusRef = null;
      }

      if (!user) return;

      activeUserStatusRef = ref(rtdb, `status/${user.uid}`);
      unsubscribeConnected = trackUserPresence(user);
    });
  }

  return () => {
    presenceUsers = Math.max(0, presenceUsers - 1);

    if (presenceUsers > 0 || !stopPresence) return;

    stopActiveConnection();

    if (activeUserStatusRef) {
      update(activeUserStatusRef, OFFLINE_STATE).catch((err) =>
        console.error("[Presence] Stop status error:", err),
      );
      activeUserStatusRef = null;
    }

    stopPresence();
    stopPresence = null;
  };
}

export function subscribeOnlineCount(cb: (n: number) => void): Unsubscribe {
  const statusRef = ref(rtdb, "status");

  return onValue(
    statusRef,
    (snap) => {
      const val = snap.val() || {};
      const count = Object.values(val).reduce<number>(
        (total, status) => total + countOnlinePresence(status),
        0,
      );
      cb(count);
    },
    (error) => {
      console.error("[Presence] subscribeOnlineCount read failed:", error);
      cb(0);
    },
  );
}

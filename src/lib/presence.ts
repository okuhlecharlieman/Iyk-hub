// src/lib/presence.ts
import { onAuthStateChanged } from "firebase/auth";
import { ref, onDisconnect, serverTimestamp, set, onValue } from "firebase/database";
import { auth, rtdb } from "./firebase";

export function startPresence() {
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const userRef = ref(rtdb, `status/${user.uid}`);
    set(userRef, { state: "online", last_changed: serverTimestamp() });
    onDisconnect(userRef).set({ state: "offline", last_changed: serverTimestamp() });
  });
}

export function subscribeOnlineCount(cb: (n: number) => void) {
  const statusRef = ref(rtdb, "status");
  onValue(statusRef, (snap) => {
    const val = snap.val() || {};
    const count = Object.values(val).filter((v: any) => v?.state === "online").length;
    cb(count);
  });
}

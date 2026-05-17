import { ref, onDisconnect, serverTimestamp, set, onValue, Unsubscribe } from "firebase/database";
import { User } from "firebase/auth";
import { rtdb } from "./firebase";

// Pass the active user into this function
export function startPresence(user: User): Unsubscribe {
  const userRef = ref(rtdb, `status/${user.uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

  // Listen to connection state changes to handle initial loads AND internet drops/reconnects
  return onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log(`[Presence] Connected to database. Marking user ${user.uid} as online.`);
      
      // 1. Set status to online
      set(userRef, { 
        state: "online", 
        last_changed: serverTimestamp(),
        email: user.email 
      }).catch(err => console.error("[Presence] Write error:", err));

      // 2. Queue up the offline change for when they close the app or disconnect
      onDisconnect(userRef).set({ 
        state: "offline", 
        last_changed: serverTimestamp() 
      }).catch(err => console.error("[Presence] onDisconnect setup error:", err));
    }
  }, (error) => {
    console.error("[Presence] CRITICAL: .info/connected permission denied or failed:", error);
  });
}

export function subscribeOnlineCount(cb: (n: number) => void): Unsubscribe {
  const statusRef = ref(rtdb, "status");
  
  return onValue(statusRef, (snap) => {
    const val = snap.val() || {};
    const count = Object.values(val).filter((v: any) => v?.state === "online").length;
    cb(count);
  }, (error) => {
    console.error("[Presence] CRITICAL: subscribeOnlineCount read permission denied:", error);
  });
}

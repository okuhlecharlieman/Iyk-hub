"use client";
import { useEffect } from "react";
import { startPresence } from "../lib/presence";

export default function PresenceProvider({ children }) {
  useEffect(() => {
    startPresence();
  }, []);
  return children;
}

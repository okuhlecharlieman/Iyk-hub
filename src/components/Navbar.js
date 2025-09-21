"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  return (
    <nav className="bg-gray-100 dark:bg-gray-800 p-4 shadow">
      <ul className="flex justify-center space-x-6 font-medium">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/opportunities">Opportunities</Link></li>
        <li><Link href="/showcase">Showcase</Link></li>
        <li><Link href="/games">Games</Link></li>

        {user ? (
          <>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li>
              <button
                onClick={() => signOut(auth)}
                className="text-red-500"
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link href="/login">Login</Link></li>
            <li><Link href="/signup">Signup</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}

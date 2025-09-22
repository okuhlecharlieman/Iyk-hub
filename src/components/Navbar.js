// components/Navbar.jsx
//
// Site navigation bar with auth status and links
//

"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <Link href="/">
        <span className="font-bold text-lg">Intwana Hub</span>
      </Link>
      <div className="space-x-4">
        <Link href="/">Home</Link>
        <Link href="/games">Games</Link>
        <Link href="/creativity">Creativity</Link>
        <Link href="/opportunities">Opportunities</Link>
        {user ? (
          <>
            <span>Welcome, {user.email}</span>
            <button onClick={logout} className="ml-4 bg-red-600 px-2 rounded">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.png" className="h-8 w-8" alt="logo" />
          <span>Intwana Hub</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/games">Games</Link>
          <Link href="/showcase">Creativity Wall</Link>
          <Link href="/opportunities">Opportunities</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          {user ? (
            <>
              <Link href="/profile">Profile</Link>
              <button onClick={()=>signOut(auth)} className="rounded bg-neutral-900 text-white px-3 py-1">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup" className="rounded bg-neutral-900 text-white px-3 py-1">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
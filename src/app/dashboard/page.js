"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const QUOTES = [
  "Keep shining, your light is needed!",
  "Every day is a new chance to grow.",
  "You are capable of amazing things.",
  "Dream big, hustle harder.",
  "Your creativity can change the world.",
];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
      else setUser(u);
    }, (err) => setError("Auth error: " + err.message));
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (err) {
      setError("Logout failed: " + err.message);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!user) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">
        Hi, {user.displayName || user.email} 👋
      </h1>
      <p className="mb-4 italic text-green-700">{quote}</p>
      <ul className="mt-6 space-y-2">
        <li><Link href="/games" className="text-blue-600 underline">🎮 Play Games</Link></li>
        <li><Link href="/showcase" className="text-blue-600 underline">🎨 Creativity Wall</Link></li>
        <li><Link href="/leaderboard" className="text-blue-600 underline">🏆 Leaderboard</Link></li>
        <li><Link href="/opportunities" className="text-blue-600 underline">🚀 Opportunities</Link></li>
        <li><Link href="/profile" className="text-blue-600 underline">👤 Profile</Link></li>
      </ul>
      <button
        onClick={handleLogout}
        className="mt-8 bg-red-500 text-white px-4 py-2 rounded"
      >
        Log out
      </button>
    </div>
  );
}
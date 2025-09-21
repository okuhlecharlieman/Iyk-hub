"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <section>
      <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>
      <p>Welcome, {user?.email} 🎉</p>
    </section>
  );
}

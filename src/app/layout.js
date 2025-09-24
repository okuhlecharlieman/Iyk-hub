// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import { useEffect } from 'react';
import { startPresence } from '../lib/presence';

export const metadata = {
  title: 'Intwana Hub',
  description: 'Chat-free digital kasi community center',
};

export default function RootLayout({ children }) {
  useEffect(() => {
    startPresence();
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
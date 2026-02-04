// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import Presence from '../components/Presence';
import { Providers } from './providers';
import ThemeSwitcher from '../components/ThemeSwitcher';

export const metadata = {
  title: 'Intwana Hub',
  description: 'Chat-free digital kasi community center',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50">
        <Providers>
          <AuthProvider>
            <Presence />
            <ThemeSwitcher />
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <Footer />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
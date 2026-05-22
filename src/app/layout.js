// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import Presence from '../components/Presence';
import { Providers } from './providers';
import CookieConsent from '../components/CookieConsent';
import AgeVerification from '../components/AgeVerification';


export const metadata = {
  title: {
    default: 'Intwana Hub — Play, Create & Grow',
    template: '%s | Intwana Hub',
  },
  description:
    'South Africa\'s premier youth innovation platform. Play games, showcase your talent, discover opportunities, and connect with a community building the future.',
  keywords: [
    'youth platform',
    'South Africa',
    'games',
    'creativity',
    'opportunities',
    'leaderboard',
    'township youth',
    'kasi',
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app'
  ),

  openGraph: {
    title: 'Intwana Hub — Play, Create & Grow',
    description:
      'Join South Africa\'s premier youth innovation platform. Play games, showcase your talent, and discover real opportunities.',
    siteName: 'Intwana Hub',
    type: 'website',
    locale: 'en_ZA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Intwana Hub — Play, Create & Grow',
    description:
      'Join South Africa\'s premier youth innovation platform. Play games, showcase your talent, and discover real opportunities.',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <Providers>
          <AuthProvider>
            <Presence />
            <a href="#content" className="skip-link">Skip to content</a>
            <Navbar />
            <main id="content">{children}</main>
            <Footer />
            <CookieConsent />
            <AgeVerification />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

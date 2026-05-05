// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import Presence from '../components/Presence';
import { Providers } from './providers';


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
    process.env.NEXT_PUBLIC_SITE_URL || 'https://intwanahub.netlify.app'
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
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <Providers>
          <AuthProvider>
            <Presence />
            <a href="#content" className="skip-link">Skip to content</a>
            <Navbar />
            <main id="content">{children}</main>
            <Footer />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import Presence from '../components/Presence';
import { Providers } from './providers';
import CookieConsent from '../components/CookieConsent';
import AgeVerification from '../components/AgeVerification';
import SurveyPopup from '../components/SurveyPopup';
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import EngagementTracker from '../components/EngagementTracker';


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app';

export const metadata = {
  title: {
    default: 'Intwana Hub — Play, Create & Grow | South Africa Youth Platform',
    template: '%s | Intwana Hub',
  },
  description:
    'South Africa\'s #1 youth innovation platform. Play games, showcase your creative talent, discover career opportunities, compete on leaderboards, and connect with a community building the future. Free to join.',
  keywords: [
    'youth platform South Africa',
    'South African youth',
    'creative platform',
    'games for youth',
    'showcase talent',
    'career opportunities South Africa',
    'leaderboard competition',
    'township youth empowerment',
    'kasi talent',
    'Intwana Hub',
    'digital skills',
    'young creators',
    'art showcase',
    'coding projects',
    'game development',
    'music production',
    'graphic design',
    'youth community',
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Intwana Hub — Play, Create & Grow | South Africa Youth Platform',
    description:
      'South Africa\'s #1 youth innovation platform. Play games, showcase your talent, discover opportunities, and connect with a community building the future.',
    siteName: 'Intwana Hub',
    url: siteUrl,
    type: 'website',
    locale: 'en_ZA',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Intwana Hub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Intwana Hub — Play, Create & Grow',
    description:
      'South Africa\'s #1 youth innovation platform. Play games, showcase your talent, and discover real opportunities.',
    images: ['/logo.png'],
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {},
  category: 'technology',
};

export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="IYK Hub" />
        <meta name="application-name" content="IYK Hub" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-48x48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Intwana Hub',
              url: siteUrl,
              description: 'South Africa\'s #1 youth innovation platform. Play games, showcase your talent, discover opportunities.',
              applicationCategory: 'SocialNetworkingApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'ZAR',
              },
              creator: {
                '@type': 'Organization',
                name: 'Intwana Yase Kasi',
                url: 'https://intwana.rf.gd/',
              },
            }),
          }}
        />
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
            <SurveyPopup />
            <ServiceWorkerRegistration />
            <EngagementTracker />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

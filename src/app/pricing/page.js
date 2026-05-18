'use client';

import Link from 'next/link';
import { FaCheck, FaTimes, FaRocket, FaStar, FaCrown, FaLock, FaUsers, FaTrophy, FaChartLine } from 'react-icons/fa';

const FREE_FEATURES = [
  { text: 'Showcase posts (up to 5 active)', included: true },
  { text: 'Community reactions (thumbs up, fire, heart)', included: true },
  { text: 'Weekly leaderboard', included: true },
  { text: 'Video chat (60s per call)', included: true },
  { text: 'Access public opportunities', included: true },
  { text: 'Basic profile page', included: true },
  { text: 'Daily login streak tracking', included: true },
  { text: 'Join multiplayer games', included: true },
];

const PRO_FEATURES = [
  { text: 'Unlimited showcase posts', included: true },
  { text: 'Boosted visibility (up to 2.5x)', included: true },
  { text: 'Extended video chat (3 min per call)', included: true },
  { text: 'Priority matchmaking in video chat', included: true },
  { text: 'Portfolio analytics & view counts', included: true },
  { text: 'Verified creator badge', included: true },
  { text: 'Early access to sponsor opportunities', included: true },
  { text: 'Custom profile themes', included: true },
  { text: 'Download showcase as portfolio PDF', included: true },
  { text: 'Featured on homepage carousel', included: true },
];

const RETENTION_FEATURES = [
  {
    icon: FaTrophy,
    title: 'Your Portfolio Lives Here',
    description: 'All your creative work, reactions, and achievements are built up over time. Your showcase becomes your living portfolio that grows with you.',
  },
  {
    icon: FaChartLine,
    title: 'Streak & Progress Tracking',
    description: 'Daily login streaks, lifetime points, and weekly leaderboard rankings that reward consistency. Start over elsewhere? You lose it all.',
  },
  {
    icon: FaUsers,
    title: 'Community & Connections',
    description: 'The people who react to your work, video chat matches, and collaborative opportunities are unique to this community.',
  },
  {
    icon: FaStar,
    title: 'Exclusive Opportunities',
    description: 'Sponsored challenges, paid gigs, and partner opportunities are only available to active IYK Hub members. More activity = better opportunities.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Free vs <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Pro</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            IYK Hub is free to use. Creator Boosts unlock premium features to help you stand out and get noticed faster.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-2">
                <FaUsers className="text-gray-600 dark:text-gray-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Free</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">For everyone</p>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">R0 <span className="text-base font-normal text-gray-500">/forever</span></p>
            <ul className="space-y-3">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <FaCheck className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{f.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block w-full text-center px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl p-8 border-2 border-purple-300 dark:border-purple-700 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 dark:bg-purple-800 rounded-full p-2">
                <FaCrown className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Creator Pro</h2>
                <p className="text-sm text-purple-600 dark:text-purple-400">For serious creators</p>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1">R20 <span className="text-base font-normal text-gray-500">/boost</span></p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Starting from R20 for 24h Lite Boost</p>
            <ul className="space-y-3">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <FaCheck className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{f.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/creator-boosts" className="mt-8 block w-full text-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
              <FaRocket className="inline mr-2" /> Boost Your Profile
            </Link>
          </div>
        </div>

        {/* Why Stay Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Why creators stay on IYK Hub
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {RETENTION_FEATURES.map((f, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                <f.icon className="text-3xl text-purple-500 mb-4" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you lose section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaLock className="text-red-500" /> What you&apos;d lose by leaving
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'All your showcase posts & reactions received',
              'Your accumulated points & leaderboard ranking',
              'Daily login streak progress & badges',
              'Access to exclusive sponsored challenges',
              'Your video chat connections & profile sharing history',
              'Any active Creator Boost visibility benefits',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <FaTimes className="text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

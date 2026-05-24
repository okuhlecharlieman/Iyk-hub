'use client';
import { FaRocket, FaPalette, FaVideo, FaTrophy, FaBriefcase, FaGamepad, FaUsers, FaStar, FaBolt } from 'react-icons/fa';
import Link from 'next/link';

const features = [
  {
    icon: <FaPalette className="text-2xl" />,
    title: 'Creative Showcase',
    description: 'Share your art, code, music, games, and designs with a global community of creators. Get feedback, reactions, and recognition for your work.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: <FaVideo className="text-2xl" />,
    title: 'Random Video Chat',
    description: 'Connect with other creators through spontaneous 1-on-1 video conversations. Meet new people, collaborate, and share ideas in real time.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <FaTrophy className="text-2xl" />,
    title: 'Leaderboard & Points',
    description: 'Earn points for your contributions and climb the weekly and lifetime leaderboards. Compete with fellow creators and track your growth.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: <FaBriefcase className="text-2xl" />,
    title: 'Opportunity Board',
    description: 'Discover jobs, gigs, collaborations, and sponsored challenges. Connect with opportunities tailored for creative professionals.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: <FaGamepad className="text-2xl" />,
    title: 'Mini Games',
    description: 'Take a break and have fun with built-in games like Rock Paper Scissors, Tic Tac Toe, Memory Match, and Hangman.',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: <FaBolt className="text-2xl" />,
    title: 'Creator Boosts',
    description: 'Supercharge your profile with Lite, Pro, or Ultra boosts. Get featured placement, extended video chat, profile analytics, custom accents, and more.',
    color: 'from-indigo-500 to-purple-500',
  },
];

const boostTiers = [
  { name: 'Lite', price: 'R29/mo', perks: ['Boost badge next to name', 'Extended video chat (3 min)', 'Portfolio view count', 'Featured in showcase'] },
  { name: 'Pro', price: 'R59/mo', perks: ['Everything in Lite', 'Video chat (5 min)', 'Profile analytics chart', 'Priority in leaderboard display'] },
  { name: 'Ultra', price: 'R99/mo', perks: ['Everything in Pro', 'Video chat (10 min)', 'Custom profile accent color', 'Homepage carousel feature', 'Early access to sponsors', 'Pinned showcase posts'] },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl text-white mb-8 shadow-xl">
          <FaRocket className="text-3xl" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          About Iyk Hub
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Iyk Hub is the all-in-one platform for young South African creatives to showcase their talent,
          connect with peers through live video, compete on leaderboards, discover opportunities,
          and grow their creative careers.
        </p>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <FaUsers className="text-blue-500" /> Our Mission
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            We believe every creative deserves a stage. Iyk Hub was built to empower emerging talent by providing
            a space where artists, coders, musicians, designers, and gamers can share their work, get discovered,
            and turn their passion into opportunities. Whether you are a developer in Johannesburg, an artist in
            Cape Town, or a musician in Durban — Iyk Hub is your community.
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          What You Can Do on Iyk Hub
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Boost Tiers */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          <FaStar className="inline-block text-amber-500 mr-2" />
          Creator Boost Plans
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Stand out from the crowd with Creator Boosts. Choose the plan that fits your needs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boostTiers.map((tier) => (
            <div key={tier.name} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mb-4">{tier.price}</p>
              <ul className="space-y-2 flex-1">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/creator-boosts"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-center"
              >
                Get {tier.name}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Create your free account and start sharing your talent with the Iyk Hub community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Sign Up Free
            </Link>
            <Link
              href="/showcase"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
            >
              Browse Showcase
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

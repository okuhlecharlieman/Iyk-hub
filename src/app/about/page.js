'use client';
/**
 * About page — rich SEO landing page with FAQ structured data,
 * feature highlights, testimonials, stats, how-it-works, and CTA sections.
 */
import { useState } from 'react';
import {
  FaRocket, FaPalette, FaVideo, FaTrophy, FaBriefcase, FaGamepad,
  FaUsers, FaStar, FaBolt, FaCode, FaMusic, FaPencilRuler, FaEllipsisH,
  FaPaintBrush, FaCrown, FaCoins, FaPoll, FaUserShield, FaChevronDown,
  FaChevronUp, FaShieldAlt, FaGlobeAfrica, FaHandshake, FaLightbulb,
  FaChartLine, FaEnvelope, FaMobileAlt, FaLock, FaHeart,
} from 'react-icons/fa';
import Link from 'next/link';

/* ── Feature cards ────────────────────────────────────────────── */
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
  {
    icon: <FaCoins className="text-2xl" />,
    title: 'Points-Based Boosts',
    description: 'Spend your earned lifetime points (500/2000/5000) to purchase Lite, Pro, or Ultra boosts instead of paying with ZAR. Reward your engagement!',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: <FaPoll className="text-2xl" />,
    title: 'Feedback Survey',
    description: 'Share your experience and help shape the future of Iyk Hub. Take the feedback survey anytime from the footer or /survey page.',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    icon: <FaUserShield className="text-2xl" />,
    title: 'Account Management',
    description: 'Full control over your account: export your data, request account deletion with a 30-day cooling-off period, or restore a pending deletion at any time.',
    color: 'from-gray-500 to-slate-500',
  },
  {
    icon: <FaHandshake className="text-2xl" />,
    title: 'Sponsored Challenges',
    description: 'Compete in brand-sponsored creative challenges with real prizes. Showcase your skills and get noticed by companies looking for fresh talent.',
    color: 'from-rose-500 to-fuchsia-500',
  },
  {
    icon: <FaGlobeAfrica className="text-2xl" />,
    title: 'Community Events',
    description: 'Join virtual and in-person meetups, hackathons, and creative jams with other South African creators building the future.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: <FaChartLine className="text-2xl" />,
    title: 'Portfolio Analytics',
    description: 'Track views, engagement, and growth on your showcase posts. Understand what resonates and optimise your creative output.',
    color: 'from-lime-500 to-green-600',
  },
];

/* ── Boost tiers ──────────────────────────────────────────────── */
const boostTiers = [
  { name: 'Lite', price: 'R20', points: '500 pts', duration: '24 hours', perks: ['Blue "Boosted" badge next to name', '1.2x visibility on showcase posts', 'Posts appear in "Featured" section'] },
  { name: 'Pro', price: 'R70', points: '2,000 pts', duration: '72 hours', perks: ['Purple "Pro Creator" badge', '1.8x visibility on showcase posts', 'Extended random chat (3 min)', 'Portfolio view count analytics', 'Priority matchmaking in random chat'] },
  { name: 'Ultra', price: 'R150', points: '5,000 pts', duration: '7 days', perks: ['Gold "Verified Creator" badge', '2.5x visibility on showcase posts', 'Extended random chat (5 min)', 'Full portfolio analytics with engagement stats', 'Custom profile accent color', 'Featured on homepage carousel', 'Early access to sponsor opportunities', 'Posts pinned in "Featured" section'] },
];

/* ── Showcase post types ──────────────────────────────────────── */
const showcaseIcons = [
  { icon: <FaPaintBrush className="text-xl" />, label: 'Art', description: 'Illustrations, paintings, digital art, 3D renders', color: 'text-violet-400' },
  { icon: <FaCode className="text-xl" />, label: 'Code', description: 'Web apps, mobile apps, scripts, open source projects', color: 'text-blue-400' },
  { icon: <FaGamepad className="text-xl" />, label: 'Game', description: 'Game development, game design, interactive experiences', color: 'text-orange-400' },
  { icon: <FaPencilRuler className="text-xl" />, label: 'Design', description: 'UI/UX, graphic design, branding, logos', color: 'text-pink-400' },
  { icon: <FaMusic className="text-xl" />, label: 'Music', description: 'Beats, songs, soundtracks, audio production', color: 'text-emerald-400' },
  { icon: <FaEllipsisH className="text-xl" />, label: 'Other', description: 'Photography, writing, crafts, anything creative', color: 'text-gray-400' },
];

/* ── How it works steps ───────────────────────────────────────── */
const howItWorks = [
  { step: 1, title: 'Sign Up Free', description: 'Create your account in under 60 seconds with just your email. No credit card required.', icon: <FaEnvelope className="text-xl" /> },
  { step: 2, title: 'Build Your Profile', description: 'Add your bio, skills, social links, and profile picture. Let the community know who you are.', icon: <FaUsers className="text-xl" /> },
  { step: 3, title: 'Showcase Your Work', description: 'Post your art, code, music, designs, or games. Tag them and let the community discover your talent.', icon: <FaPalette className="text-xl" /> },
  { step: 4, title: 'Earn & Grow', description: 'Earn points from engagement, climb leaderboards, unlock boosts, and get noticed by sponsors and employers.', icon: <FaTrophy className="text-xl" /> },
];

/* ── Platform stats ───────────────────────────────────────────── */
const stats = [
  { label: 'Creative Categories', value: '6+', description: 'Art, Code, Music, Design, Games & more' },
  { label: 'Boost Tiers', value: '3', description: 'Lite, Pro & Ultra with unique perks' },
  { label: 'Mini Games', value: '5+', description: 'Rock Paper Scissors, Tic Tac Toe & more' },
  { label: 'Free to Join', value: '100%', description: 'No subscription required to participate' },
];

/* ── Why choose Iyk Hub ───────────────────────────────────────── */
const whyChoose = [
  { icon: <FaGlobeAfrica className="text-2xl text-blue-500" />, title: 'Built for South Africa', description: 'Made by South African creators, for South African creators. We understand the local creative landscape, township talent, and the challenges young creatives face.' },
  { icon: <FaLock className="text-2xl text-green-500" />, title: 'Safe & Secure', description: 'Admin-moderated content, POPIA-compliant data handling, secure Firebase authentication, and full account control including data export and deletion.' },
  { icon: <FaMobileAlt className="text-2xl text-purple-500" />, title: 'Works on Any Device', description: 'Fully responsive design that works beautifully on phones, tablets, and desktops. Install as a PWA for an app-like experience.' },
  { icon: <FaHeart className="text-2xl text-red-500" />, title: 'Community First', description: 'Real human connections through video chat, creative feedback, leaderboard competitions, and sponsored challenges. No bots, no fake engagement.' },
  { icon: <FaLightbulb className="text-2xl text-amber-500" />, title: 'Real Opportunities', description: 'Not just a portfolio site — Iyk Hub connects you with real jobs, gigs, hackathons, and sponsored challenges from actual companies.' },
  { icon: <FaShieldAlt className="text-2xl text-indigo-500" />, title: 'Fair & Transparent', description: 'Open leaderboard scoring, transparent boost pricing, and community-driven feedback. Everyone starts equal and earns their way up.' },
];

/* ── FAQ data for structured data + accordion ─────────────────── */
const faqItems = [
  {
    question: 'What is Iyk Hub?',
    answer: 'Iyk Hub (Intwana Hub) is South Africa\'s premier youth innovation platform where young creatives can showcase their art, code, music, designs, and games. It combines a creative portfolio showcase, random video chat, leaderboard competitions, job/opportunity boards, mini games, and creator boosts — all in one free platform.',
  },
  {
    question: 'Is Iyk Hub free to use?',
    answer: 'Yes! Iyk Hub is completely free to join and use. You can create an account, post to the showcase, join video chats, play games, and compete on leaderboards at no cost. Optional Creator Boosts are available starting from R20 (or using earned points) for extra visibility and perks, but they\'re never required.',
  },
  {
    question: 'How do I earn points on Iyk Hub?',
    answer: 'You earn points through engagement: posting to the showcase, receiving reactions on your work, participating in video chats, playing mini games, completing sponsored challenges, and being active in the community. Points are tracked on both weekly and lifetime leaderboards, and can be spent on Creator Boosts.',
  },
  {
    question: 'What are Creator Boosts and how do they work?',
    answer: 'Creator Boosts are optional upgrades that give your profile extra visibility. There are three tiers: Lite (R20 or 500 points, 24 hours), Pro (R70 or 2,000 points, 72 hours), and Ultra (R150 or 5,000 points, 7 days). Perks include verified badges, increased post visibility, extended video chat time, portfolio analytics, and custom profile accents.',
  },
  {
    question: 'What types of creative work can I showcase?',
    answer: 'You can showcase Art (illustrations, paintings, digital art, 3D renders), Code (web apps, mobile apps, scripts, open source), Games (game development, interactive experiences), Design (UI/UX, graphic design, branding, logos), Music (beats, songs, soundtracks, audio production), and Other (photography, writing, crafts, anything creative).',
  },
  {
    question: 'How does the random video chat work?',
    answer: 'The random video chat connects you with another creator for a live 1-on-1 video conversation. Standard sessions last 1 minute, while boosted creators get extended time (up to 5 minutes with Ultra Boost). It\'s a great way to network, collaborate, and discover new creative talent.',
  },
  {
    question: 'Is Iyk Hub safe for young people?',
    answer: 'Yes. All showcase posts are moderated by admins before appearing publicly. Video chats have time limits and reporting features. The platform uses Firebase Authentication for secure sign-in, follows POPIA (Protection of Personal Information Act) guidelines, and gives users full control over their data with export and deletion options.',
  },
  {
    question: 'Can I find real job opportunities on Iyk Hub?',
    answer: 'Absolutely! The Opportunity Board features real jobs, freelance gigs, internships, collaborations, and sponsored challenges posted by companies and organisations. Opportunities are moderated and approved by admins, and expired listings are automatically hidden.',
  },
  {
    question: 'How do promo codes work on Iyk Hub?',
    answer: 'Admins can create promo codes that give bonus points to users. If you receive a promo code, you can redeem it on your Profile page in the "Redeem Promo Code" section. Promo codes may have expiry dates and usage limits, so redeem them quickly!',
  },
  {
    question: 'Can I use Iyk Hub on my phone?',
    answer: 'Yes! Iyk Hub is fully responsive and works on any device — phone, tablet, or desktop. You can also install it as a Progressive Web App (PWA) for an app-like experience by tapping "Add to Home Screen" in your mobile browser.',
  },
  {
    question: 'How is Iyk Hub different from other creative platforms?',
    answer: 'Iyk Hub is uniquely built for South African youth. Unlike global platforms, it understands the local creative landscape — from township talent to university creatives. It combines portfolio showcasing, live video networking, gamification, and real job opportunities in one platform, with pricing in ZAR and content moderated for the local community.',
  },
  {
    question: 'Can I delete my account and data?',
    answer: 'Yes. Iyk Hub gives you full control over your data. You can export all your data at any time, and request account deletion with a 30-day cooling-off period. During the cooling-off period, you can restore your account if you change your mind. After 30 days, your data is permanently removed.',
  },
  {
    question: 'What games are available on Iyk Hub?',
    answer: 'Iyk Hub features several built-in mini games including Rock Paper Scissors, Tic Tac Toe, Memory Match, Hangman, and more. Games are a fun way to take a break from creating and earn extra points for the leaderboard.',
  },
  {
    question: 'How do sponsored challenges work?',
    answer: 'Companies and brands post creative challenges with real prizes and rewards. You submit your entry through the platform, and winners are selected by the sponsors or community voting. Sponsored challenges are a great way to get noticed by potential employers and build your portfolio.',
  },
  {
    question: 'Do I need to be from South Africa to use Iyk Hub?',
    answer: 'While Iyk Hub is designed with South African creators in mind, anyone from anywhere in the world is welcome to join! The platform supports global participation, but many features (like opportunities and sponsored challenges) are focused on the South African creative ecosystem.',
  },
];

/* ── FAQ Accordion Item ───────────────────────────────────────── */
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-900 dark:text-white pr-4">{question}</span>
        {isOpen ? (
          <FaChevronUp className="text-blue-500 flex-shrink-0" />
        ) : (
          <FaChevronDown className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-4 bg-white dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page Component ──────────────────────────────────────── */
export default function AboutPage() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // FAQ structured data for Google rich results
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  // Organisation structured data
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Iyk Hub',
    alternateName: 'Intwana Hub',
    url: 'https://iyk-hub.vercel.app',
    description: 'South Africa\'s premier youth innovation platform for creative talent showcase, networking, and career opportunities.',
    foundingLocation: {
      '@type': 'Place',
      name: 'South Africa',
    },
    sameAs: [],
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl text-white mb-8 shadow-xl">
          <FaRocket className="text-3xl" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          About Iyk Hub
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Iyk Hub is South Africa&apos;s all-in-one platform for young creatives to showcase talent,
          connect through live video, compete on leaderboards, discover real opportunities,
          and grow their creative careers — completely free.
        </p>
      </div>

      {/* Platform Stats */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="font-semibold text-gray-900 dark:text-white mt-1">{stat.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <FaUsers className="text-blue-500" /> Our Mission
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            We believe every creative deserves a stage. Iyk Hub was built to empower emerging talent by providing
            a space where artists, coders, musicians, designers, and gamers can share their work, get discovered,
            and turn their passion into opportunities.
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Whether you are a developer in Johannesburg, an artist in
            Cape Town, a musician in Durban, or a designer in Soweto — Iyk Hub is your community.
            We are building the largest network of young South African creatives, one showcase post at a time.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          How Iyk Hub Works
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Get started in minutes — no complicated setup, no credit card, no barriers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {howItWorks.map((item) => (
            <div key={item.step} className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full text-white mb-4 shadow-lg mx-auto">
                <span className="text-2xl font-bold">{item.step}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          What You Can Do on Iyk Hub
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Everything you need to showcase your talent, grow your network, and launch your creative career.
        </p>
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

      {/* Why Choose Iyk Hub */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Why Choose Iyk Hub?
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Here&apos;s what makes Iyk Hub the best platform for young South African creatives.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyChoose.map((item) => (
            <div key={item.title} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="mb-3">{item.icon}</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Showcase Post Types */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          <FaPalette className="inline-block text-purple-500 mr-2" />
          Showcase Post Types
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
          When you share your work on the Showcase, choose the type that best fits your creation. Each type has its own icon.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {showcaseIcons.map((item) => (
            <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className={`mx-auto mb-2 ${item.color}`}>{item.icon}</div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.label}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
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
          Stand out from the crowd with Creator Boosts. Choose the plan that fits your needs — pay with ZAR or earned points.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boostTiers.map((tier) => (
            <div key={tier.name} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{tier.price}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">or {tier.points}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">for {tier.duration}</p>
              <ul className="space-y-2 flex-1">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
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

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16" id="faq">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
          Everything you need to know about Iyk Hub. Can&apos;t find an answer? Reach out to us anytime.
        </p>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openFAQ === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Showcase Your Talent?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Join thousands of young South African creatives building their portfolios, earning points,
            and discovering real opportunities. It&apos;s 100% free.
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
            <Link
              href="/opportunities"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
            >
              View Opportunities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

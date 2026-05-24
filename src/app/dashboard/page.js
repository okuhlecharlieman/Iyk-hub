'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { fetchLatestQuote, recordDailyLogin, getAchievements } from '../../lib/firebase/helpers';
import Link from 'next/link';
import { FaArrowRight, FaGamepad, FaBriefcase, FaVideo, FaPalette, FaTrophy, FaRocket, FaUsers } from 'react-icons/fa';

import PointsCard from '../../components/PointsCard';
import LeaderboardPreview from '../../components/LeaderboardPreview';
import OnlineCount from '../../components/OnlineCount';
import InstallButton from '../../components/InstallButton';
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger } from 'react-icons/gi';

const GAME_ICONS = {
  rps: <GiSwordman size={28} />,
  tictactoe: <GiTicTacToe size={28} />,
  memory: <GiCardRandom size={28} />,
  hangman: <GiHanger size={28} />,
};

const GAME_COLORS = {
  rps: 'from-red-500 to-orange-500',
  tictactoe: 'from-blue-500 to-indigo-500',
  memory: 'from-green-500 to-emerald-500',
  hangman: 'from-purple-500 to-pink-500',
};

export default function DashboardPage() {
  const { user, userProfile, isAdmin } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [opps, setOpps] = useState([]);
  const [streak, setStreak] = useState(null);
  const [formattedDate, setFormattedDate] = useState('');

  const achievements = getAchievements(userProfile);

  useEffect(() => {
    if (user) {
      async function load() {
        const [q, streakData] = await Promise.all([
          fetchLatestQuote(),
          recordDailyLogin(user.uid).catch(() => null),
        ]);
        setQuote(q);
        setStreak(streakData);
        if (q && q.createdAt) {
          const date = new Date(q.createdAt.seconds * 1000);
          setFormattedDate(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
        try {
          const oppsRes = await fetch('/api/opportunities/public?limit=3');
          if (oppsRes.ok) {
            const oppsData = await oppsRes.json();
            setOpps(oppsData.opportunities || []);
          }
        } catch {
          setOpps([]);
        }
      }
      load();
    }
  }, [user]);

  const quickLinks = [
    { href: '/video', icon: <FaVideo />, label: 'Random Chat', desc: 'Connect live', color: 'bg-blue-500' },
    { href: '/showcase', icon: <FaPalette />, label: 'Showcase', desc: 'Share work', color: 'bg-purple-500' },
    { href: '/sponsored-challenges', icon: <FaTrophy />, label: 'Challenges', desc: 'Win prizes', color: 'bg-amber-500' },
    { href: '/creator-boosts', icon: <FaRocket />, label: 'Boosts', desc: 'Get noticed', color: 'bg-green-500' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-blue-200 text-sm font-medium mb-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                  Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
                </h1>
                <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-xl">
                  {quote?.text ? (
                    <>
                      <em>&ldquo;{quote.text}&rdquo;</em>
                      {quote.author && <span className="block text-xs text-blue-200 mt-1">&mdash; {quote.author}</span>}
                    </>
                  ) : 'Your journey to greatness starts now.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <InstallButton />
                <OnlineCount />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all hover:-translate-y-0.5">
                <div className={`${link.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                  {link.icon}
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{link.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{link.desc}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Games */}
              <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaGamepad className="text-blue-500" /> Quick Games
                  </h2>
                  <Link className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1" href="/games">
                    See all <FaArrowRight size={12} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'rps', name: 'Rock Paper Scissors' },
                    { id: 'tictactoe', name: 'Tic-Tac-Toe' },
                    { id: 'memory', name: 'Memory Match' },
                    { id: 'hangman', name: 'Hangman' },
                  ].map((g) => (
                    <button key={g.id} onClick={() => router.push(`/games/${g.id}-${Date.now()}`)}
                      className="group relative overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      <div className={`absolute inset-0 bg-gradient-to-br ${GAME_COLORS[g.id]} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                      <div className="relative text-gray-600 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-2 transition-colors">
                        {GAME_ICONS[g.id]}
                      </div>
                      <p className="relative font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300">{g.name}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Opportunities */}
              <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaBriefcase className="text-green-500" /> Opportunities
                  </h2>
                  <Link className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1" href="/opportunities">
                    View all <FaArrowRight size={12} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {opps.length === 0 ? (
                    <div className="text-center py-8">
                      <FaBriefcase className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No opportunities at the moment.</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Check back soon!</p>
                    </div>
                  ) : null}
                  {opps.map((o) => (
                    <a key={o.id} href={o.link} target="_blank" rel="noreferrer" 
                      className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2.5 flex-shrink-0">
                        <FaBriefcase className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">{o.title}</h3>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">{o.org}</p>
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 line-clamp-2">
                          {o.description?.slice(0, 120)}{o.description?.length > 120 ? '…' : ''}
                        </p>
                      </div>
                      <FaArrowRight className="text-gray-400 flex-shrink-0 mt-1" size={12} />
                    </a>
                  ))}
                </div>
              </section>

              {/* Admin Quick Access */}
              {isAdmin && (
                <Link href="/admin" className="block bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 p-5 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500 rounded-lg p-2.5 text-white">
                      <FaUsers />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Admin Dashboard</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Manage users, payments, and content</p>
                    </div>
                    <FaArrowRight className="ml-auto text-amber-500" />
                  </div>
                </Link>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Streak Card */}
              {streak && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3 flex items-center gap-2">
                    <span className="text-orange-500 text-lg">🔥</span> Daily Streak
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-3xl font-extrabold text-orange-500">{streak.current || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                    </div>
                    <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="text-center flex-1">
                      <p className="text-3xl font-extrabold text-purple-500">{streak.longest || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
                    Log in every day to keep your streak going!
                  </p>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3 flex items-center gap-2">
                    <span className="text-amber-500 text-lg">🏅</span> Achievements
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {achievements.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        <span>{a.icon}</span> {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <PointsCard />
              <LeaderboardPreview weekly />
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

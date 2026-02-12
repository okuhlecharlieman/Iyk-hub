
import Link from 'next/link';
import { listApprovedOpportunities, listShowcasePosts } from '../lib/firebaseHelpers';
import ContentCard from '../components/ContentCard';
import { FaArrowRight, FaGamepad, FaBriefcase, FaPaintBrush } from 'react-icons/fa';

// Re-evaluate the page every 5 minutes
export const revalidate = 300; 

// Helper to create a consistent section layout
const FeatureSection = ({ title, icon, children, href }) => (
  <section className="bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        {icon} {title}
      </h2>
      <Link href={href} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1.5 transition-gap">
        <span>View all</span>
        <FaArrowRight />
      </Link>
    </div>
    {children}
  </section>
);

export default async function Home() {
  const [opps, posts] = await Promise.all([
    listApprovedOpportunities(3),
    listShowcasePosts(3),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="max-w-7xl mx-auto space-y-20 md:space-y-28">

        {/* Hero Section */}
        <div className="text-center py-16 md:py-24 bg-gradient-to-b from-white/70 via-white to-gray-100/70 dark:from-gray-900/70 dark:via-gray-800/80 dark:to-gray-900/70 rounded-3xl shadow-inner-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Welcome to Intwana Hub
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            A positive Kasi community hub to play, create, and grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary rounded-full px-8 py-3.5 text-lg shadow-lg hover:scale-105 transition-transform transform">Get Started</Link>
            <Link href="#how-it-works" className="btn-secondary rounded-full px-8 py-3.5 text-lg shadow-md hover:scale-105 transition-transform transform">Learn More</Link>
          </div>
        </div>

        {/* How it Works Section */}
        <section id="how-it-works" className="scroll-mt-24">
          <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">How It Works</h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">Engage, earn points, and climb the leaderboard.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                  <FaGamepad className="text-4xl text-blue-500 mx-auto mb-5" />
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Play Games</h3>
                  <p className="text-gray-600 dark:text-gray-400">Challenge yourself with fun games and earn points for playing.</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                  <FaPaintBrush className="text-4xl text-teal-500 mx-auto mb-5" />
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Showcase Talent</h3>
                  <p className="text-gray-600 dark:text-gray-400">Share your art, music, or projects with the community.</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                  <FaBriefcase className="text-4xl text-yellow-500 mx-auto mb-5" />
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Find Opportunities</h3>
                  <p className="text-gray-600 dark:text-gray-400">Discover jobs, learnerships, and other opportunities.</p>
              </div>
          </div>
        </section>

        {/* Showcase Section */}
        <FeatureSection title="Latest Creations" icon={<FaPaintBrush />} href="/showcase">
          {posts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {posts.map(p => <ContentCard key={p.id} p={p} noactions />)}
            </div>
          ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No creations posted yet. Be the first!</p>}
        </FeatureSection>
        
        {/* Opportunities Section */}
        <FeatureSection title="New Opportunities" icon={<FaBriefcase />} href="/opportunities">
           {opps.length > 0 ? (
            <div className="space-y-4">
              {opps.map(o => (
                <Link key={o.id} href={o.link || '#'} target="_blank" rel="noopener noreferrer" className="block bg-gray-100/50 dark:bg-gray-700/50 p-5 rounded-lg hover:bg-gray-200/70 dark:hover:bg-gray-700/80 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{o.title}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{o.org}</p>
                </Link>
              ))}
            </div>
          ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No new opportunities right now. Check back soon!</p>}
        </FeatureSection>
      </div>
    </div>
  );
}


import Link from 'next/link';
import { listApprovedOpportunities, listShowcasePosts } from '../lib/firebaseHelpers';
import ContentCard from '../components/ContentCard';
import { FaArrowRight, FaGamepad, FaBriefcase, FaPaintBrush } from 'react-icons/fa';

// Re-evaluate the page every 5 minutes
export const revalidate = 300; 

// Helper to create a consistent section layout
const FeatureSection = ({ title, icon, children, href }) => (
  <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
        {icon} {title}
      </h2>
      <Link href={href} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1">
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
    <div className="space-y-12 md:space-y-16">
      {/* Hero Section */}
      <div className="text-center py-12 md:py-20 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-inner-lg">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-md">
          Welcome to Intwana Hub
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          A positive Kasi community hub to play, create, and grow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="btn-primary rounded-full px-8 py-3 text-lg shadow-lg hover:scale-105 transition-transform">Get Started</Link>
          <Link href="#how-it-works" className="btn-secondary rounded-full px-8 py-3 text-lg shadow-lg hover:scale-105 transition-transform">Learn More</Link>
        </div>
      </div>

      {/* How it Works Section */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">How It Works</h2>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Engage, earn points, and climb the leaderboard.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <FaGamepad className="text-4xl text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Play Games</h3>
                <p className="text-gray-600 dark:text-gray-400">Challenge yourself with fun games and earn points for playing.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <FaPaintBrush className="text-4xl text-teal-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Showcase Talent</h3>
                <p className="text-gray-600 dark:text-gray-400">Share your art, music, or projects with the community.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <FaBriefcase className="text-4xl text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Find Opportunities</h3>
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
        ) : <p className="text-gray-500 dark:text-gray-400">No creations posted yet. Be the first!</p>}
      </FeatureSection>
      
      {/* Opportunities Section */}
      <FeatureSection title="New Opportunities" icon={<FaBriefcase />} href="/opportunities">
         {opps.length > 0 ? (
          <div className="space-y-4">
            {opps.map(o => (
              <Link key={o.id} href={o.link || '#'} target="_blank" rel="noopener noreferrer" className="block bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{o.title}</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{o.org}</p>
              </Link>
            ))}
          </div>
        ) : <p className="text-gray-500 dark:text-gray-400">No new opportunities right now. Check back soon!</p>}
      </FeatureSection>
    </div>
  );
}

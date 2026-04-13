'use client';
import Link from 'next/link';
import { getApprovedOpportunities } from '../lib/firebase/helpers';
import ContentCard from '../components/ContentCard';
import { FaArrowRight, FaGamepad, FaBriefcase, FaPaintBrush, FaRocket, FaUsers, FaTrophy, FaStar, FaCheckCircle } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const FeatureCard = ({ icon, title, description, href, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    teal: "from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    emerald: "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
  };

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <div className="relative p-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white mb-6 shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{description}</p>
        <Link
          href={href}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105`}
        >
          Explore <FaArrowRight className="text-sm" />
        </Link>
      </div>
    </div>
  );
};

const StatCard = ({ number, label, icon }) => (
  <div className="text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white mb-3">
      {icon}
    </div>
    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{number}</div>
    <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
  </div>
);

const TestimonialCard = ({ quote, author, role, company }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center mb-4">
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} className="text-yellow-400 text-sm" />
      ))}
    </div>
    <blockquote className="text-gray-700 dark:text-gray-300 mb-4 italic">"{quote}"</blockquote>
    <div className="flex items-center">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
        {author.charAt(0)}
      </div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">{author}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{role}, {company}</div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [opps, setOpps] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const oppsData = await getApprovedOpportunities(3);
        setOpps(oppsData);

        const res = await fetch('/api/showcase');
        if (!res.ok) {
          throw new Error(`API call failed with status: ${res.status}`);
        }
        const postsData = await res.json();
        setPosts(Array.isArray(postsData) ? postsData.slice(0, 3) : []);

      } catch (e) {
        console.error("Failed to fetch homepage data:", e);
        setError("Sorry, we couldn't load all content. Please try refreshing.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-medium mb-8">
              <FaRocket className="mr-2" />
              Empowering Youth Through Technology
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Intwana Hub
              </span>
              <br />
              <span className="text-3xl md:text-4xl font-normal text-gray-600 dark:text-gray-300">
                Where Talent Meets Opportunity
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-10 leading-relaxed">
              Join South Africa's premier youth innovation platform. Play games, showcase your talent,
              discover opportunities, and connect with a community that's building the future.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Start Your Journey
                <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/sponsored-challenges"
                className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-700"
              >
                <FaTrophy className="mr-2 text-yellow-500" />
                View Challenges
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <StatCard number="500+" label="Active Members" icon={<FaUsers />} />
              <StatCard number="50+" label="Opportunities" icon={<FaBriefcase />} />
              <StatCard number="100+" label="Projects Shared" icon={<FaPaintBrush />} />
              <StatCard number="25+" label="Games Available" icon={<FaGamepad />} />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover opportunities, build your portfolio, and connect with like-minded creators in our vibrant community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FaGamepad className="text-2xl" />}
              title="Play & Learn"
              description="Challenge yourself with engaging games while earning points and unlocking achievements."
              href="/games"
              color="blue"
            />
            <FeatureCard
              icon={<FaPaintBrush className="text-2xl" />}
              title="Showcase Talent"
              description="Share your art, code, music, and projects with our supportive community."
              href="/showcase"
              color="teal"
            />
            <FeatureCard
              icon={<FaBriefcase className="text-2xl" />}
              title="Find Opportunities"
              description="Discover internships, jobs, learnerships, and mentorship programs."
              href="/opportunities"
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real stories from real creators building their futures.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Intwana Hub helped me land my first tech internship. The games were fun, but the community connections were invaluable."
              author="Thandi M."
              role="Software Developer"
              company="TechCorp SA"
            />
            <TestimonialCard
              quote="As a young artist, this platform gave me the confidence to share my work. I've grown so much through the feedback and opportunities here."
              author="Sipho K."
              role="Digital Artist"
              company="Creative Studios"
            />
            <TestimonialCard
              quote="The sponsored challenges pushed me to learn new skills and build my portfolio. Now I'm working on exciting projects!"
              author="Nomsa T."
              role="UX Designer"
              company="Design Agency"
            />
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">

          {/* Showcase Section */}
          <section>
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Latest Creations</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Discover amazing talent from our community</p>
              </div>
              <Link
                href="/showcase"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                View All <FaArrowRight />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : posts.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-8">
                {posts.map(p => <ContentCard key={p.id} p={p} />)}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaPaintBrush className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No creations posted yet. Be the first!</p>
              </div>
            )}
          </section>

          {/* Opportunities Section */}
          <section>
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">New Opportunities</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Find your next big opportunity</p>
              </div>
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                View All <FaArrowRight />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : opps.length > 0 ? (
              <div className="grid md:grid-cols-1 gap-6">
                {opps.map(o => (
                  <Link
                    key={o.id}
                    href={o.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {o.title}
                        </h3>
                        <p className="text-lg text-purple-600 dark:text-purple-400 font-semibold mb-3">{o.org}</p>
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <FaCheckCircle className="text-green-500 mr-2" />
                          <span>Verified Opportunity</span>
                        </div>
                      </div>
                      <FaArrowRight className="text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaBriefcase className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No new opportunities right now. Check back soon!</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of young creators, innovators, and entrepreneurs building their futures on Intwana Hub.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Get Started Free
              <FaRocket className="ml-2" />
            </Link>
            <Link
              href="/sponsored-challenges/create"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 bg-opacity-20 text-white font-bold rounded-2xl border-2 border-white border-opacity-30 hover:bg-opacity-30 transition-all duration-300 hover:scale-105"
            >
              <FaTrophy className="mr-2" />
              Sponsor a Challenge
            </Link>
          </div>
        </div>

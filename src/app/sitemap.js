/**
 * Module: sitemap.js.
 */

const URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app';

/** sitemap. */
export default async function sitemap() {
  const now = new Date().toISOString();

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/about', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/showcase', priority: 0.9, changeFrequency: 'daily' },
    { path: '/opportunities', priority: 0.9, changeFrequency: 'daily' },
    { path: '/leaderboard', priority: 0.8, changeFrequency: 'daily' },
    { path: '/games', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/creator-boosts', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/donate', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/sponsored-challenges', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((route) => ({
    url: `${URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

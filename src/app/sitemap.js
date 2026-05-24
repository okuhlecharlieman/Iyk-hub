
const URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app';

export default async function sitemap() {
  const staticRoutes = [
    '',
    '/about',
    '/showcase',
    '/opportunities',
    '/leaderboard',
    '/games',
    '/creator-boosts',
    '/donate',
  ].map((route) => ({
    url: `${URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return staticRoutes;
}

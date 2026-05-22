
import { getAllOpportunities } from '../lib/firebase/helpers';
import { getAllShowcaseItems } from '../lib/firebase/showcase';

const URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app';


export default async function sitemap() {
  const opportunities = (await getAllOpportunities()) || [];
  const showcases = (await getAllShowcaseItems()) || [];

  const opportunityUrls = opportunities.map(({ id, lastmod }) => ({
    url: `${URL}/opportunity/${id}`,
    lastModified: lastmod ? new Date(lastmod).toISOString() : new Date().toISOString(),
  }));

  const showcaseUrls = showcases.map(({ id, lastmod }) => ({
    url: `${URL}/showcase/${id}`,
    lastModified: lastmod ? new Date(lastmod).toISOString() : new Date().toISOString(),
  }));

  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/showcase',
    '/opportunities',
    '/leaderboard',
    '/games',
  ].map((route) => ({
    url: `${URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return [...staticRoutes, ...opportunityUrls, ...showcaseUrls];
}

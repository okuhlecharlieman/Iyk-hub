export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iyk-hub.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/dashboard/', '/profile/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

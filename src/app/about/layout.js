/**
 * Layout wrapper for /app/about — enhanced SEO metadata with rich keywords.
 */
export const metadata = {
  title: 'About Iyk Hub — South Africa\'s #1 Youth Creative Platform | Free Portfolio & Opportunities',
  description: 'Iyk Hub (Intwana Hub) is South Africa\'s premier free platform for young creatives. Showcase art, code, music, designs & games. Random video chat, leaderboards, job opportunities, mini games, and Creator Boosts. Join the community today.',
  keywords: [
    'Iyk Hub',
    'Intwana Hub',
    'South Africa youth platform',
    'creative portfolio South Africa',
    'young creatives platform',
    'free creative showcase',
    'South African artists',
    'township talent platform',
    'kasi creatives',
    'youth jobs South Africa',
    'creative opportunities Cape Town',
    'Johannesburg youth platform',
    'Durban creatives',
    'Soweto talent',
    'art showcase platform',
    'coding portfolio South Africa',
    'music production platform',
    'graphic design community',
    'game development South Africa',
    'youth empowerment South Africa',
    'POPIA compliant platform',
    'creator boosts',
    'random video chat creatives',
    'leaderboard competition',
    'sponsored challenges South Africa',
    'freelance gigs South Africa',
  ],
  openGraph: {
    title: 'About Iyk Hub — South Africa\'s #1 Youth Creative Platform',
    description: 'Free platform for young South African creatives. Showcase talent, discover jobs, compete on leaderboards, and connect via live video. Join thousands of creators today.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Iyk Hub — South Africa\'s #1 Youth Creative Platform',
    description: 'Free platform for young South African creatives. Showcase talent, discover jobs, compete on leaderboards, and connect via live video.',
  },
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({ children }) {
  return children;
}

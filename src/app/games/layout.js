/**
 * Layout wrapper for /app/games.
 */
export const metadata = {
  title: 'Games — Play & Earn Points',
  description: 'Play fun games and earn points on Intwana Hub. Compete with other South African youth on the leaderboard. Free to play.',
  openGraph: {
    title: 'Games — Intwana Hub',
    description: 'Play fun games and earn points. Compete with other South African youth on the leaderboard.',
  },
};

/** GamesLayout — layout wrapper component. */
export default function GamesLayout({ children }) {
  return children;
}

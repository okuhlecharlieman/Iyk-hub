import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 md:py-20 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
        Welcome to Intwana Hub
      </h1>
      <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
        A positive kasi community hub where youth can play games, showcase their
        creativity, and find real-world opportunities.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md justify-center">
        <Link href="/games" className="btn-primary rounded px-6 py-3 text-lg w-full sm:w-auto text-center shadow hover:scale-105 transition">Play Games</Link>
        <Link href="/opportunities" className="btn-yellow rounded px-6 py-3 text-lg w-full sm:w-auto text-center shadow hover:scale-105 transition">Opportunities</Link>
        <Link href="/showcase" className="btn-blue rounded px-6 py-3 text-lg w-full sm:w-auto text-center shadow hover:scale-105 transition">Showcase</Link>
      </div>
    </div>
  );
}

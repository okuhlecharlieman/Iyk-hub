import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800">
      <h1 className="text-xl font-bold">Intwana Hub</h1>
      <ul className="flex space-x-4">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/dashboard">Dashboard</Link></li>
        <li><Link href="/opportunities">Opportunities</Link></li>
        <li><Link href="/showcase">Showcase</Link></li>
        <li><Link href="/games">Games</Link></li>
      </ul>
    </nav>
  );
}

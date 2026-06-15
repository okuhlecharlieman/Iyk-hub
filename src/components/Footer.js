/**
 * Footer component.
 */
import Link from 'next/link';
import { FaGithub, FaBookOpen, FaUsers, FaCode, FaLinkedin, FaInstagram, FaTiktok, FaGlobe, FaFacebook } from 'react-icons/fa';
import InstallButton from './InstallButton';

const productLinks = [
  { label: 'Games', href: '/games' },
  { label: 'Showcase', href: '/showcase' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Feedback Survey', href: '/survey' },
  { label: 'About', href: '/about' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const docsLinks = [
  { label: 'Developer Guide', href: 'https://github.com/okuhlecharlieman/Iyk-hub/blob/main/docs/DEVELOPER_GUIDE.md', icon: FaCode },
  { label: 'User Guide', href: 'https://github.com/okuhlecharlieman/Iyk-hub/blob/main/docs/USER_GUIDE.md', icon: FaUsers },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/intwana-yase-kasi/', icon: FaLinkedin },
  { label: 'Instagram', href: 'https://www.instagram.com/intwanayasekasi26', icon: FaInstagram },
  { label: 'TikTok', href: 'https://www.tiktok.com/@intwana.yase.kasi7', icon: FaTiktok },
  { label: 'Website', href: 'https://intwana.rf.gd/', icon: FaGlobe },
  { label: 'Facebook', href: 'https://web.facebook.com/Intwana1', icon: FaFacebook },
  { label: 'Odysee', href: 'https://odysee.com/@intwanayasekasi:2', icon: FaGlobe },
];

/** Footer React component. */
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Intwana Hub</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              A positive, chat-free digital community center to play, create, and grow.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {socialLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title={link.label}>
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Explore</h4>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Legal</h4>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-6">Documentation</h4>
            <ul className="mt-3 space-y-2">
              {docsLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">
                    <link.icon className="h-4 w-4" /> {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Open Source</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://github.com/okuhlecharlieman/Iyk-hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <FaGithub className="h-4 w-4" /> Project Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Intwana Hub &mdash; Intwana Yase Kasi</p>
          <div className="flex items-center gap-4">
            <InstallButton />
            <span className="inline-flex items-center gap-1"><FaBookOpen className="h-3.5 w-3.5" /> Built for community growth</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

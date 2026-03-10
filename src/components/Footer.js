import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';

const socialLinks = [
  {
    name: 'GitHub',
    icon: FaGithub,
    url: 'https://github.com/your-repo', // TODO: Replace with actual URL
  },
  {
    name: 'Twitter',
    icon: FaTwitter,
    url: 'https://twitter.com/your-profile', // TODO: Replace with actual URL
  },
  {
    name: 'LinkedIn',
    icon: FaLinkedin,
    url: 'https://linkedin.com/in/your-profile', // TODO: Replace with actual URL
  },
];

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Intwana Hub. All rights reserved.
          </p>
          <div className="flex items-center space-x-5">
            {socialLinks.map(social => (
              <a 
                key={social.name} 
                href={social.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
              >
                <span className="sr-only">{social.name}</span>
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// src/app/layout.js
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';
import Presence from '../components/Presence';
import { Providers } from './providers';


export const metadata = {
  title: 'Intwana Hub',
  description: 'Chat-free digital kasi community center',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
        <Providers>
          <AuthProvider>
            <Presence />
            <a href="#content" className="skip-link">Skip to content</a>
            <Navbar />
            <main id="content">{children}</main>
            <Footer />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

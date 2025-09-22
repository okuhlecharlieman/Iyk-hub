// app/layout.jsx
//
// Root layout for Intwana Hub with Firebase auth context
//

import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "Intwana Hub",
  description: "A kasi hub for creativity, fun, and opportunities",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

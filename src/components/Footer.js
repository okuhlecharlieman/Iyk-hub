export default function Footer() {
  return (
    <footer className="p-4 text-center bg-gray-100 dark:bg-gray-800">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        © {new Date().getFullYear()} Intwana Hub. All rights reserved.
      </p>
    </footer>
  );
}

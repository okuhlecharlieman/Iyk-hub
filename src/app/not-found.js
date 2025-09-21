import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
        404 - Page Not Found
      </h1>
      <p>Eish sorry, the page you’re looking for does not exist.</p>
      <Link href="/">
        <a className="mt-6 text-blue-500 underline">Go back home</a>
      </Link>
    </div>
  );
}

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary, #aaa)', marginBottom: '16px' }}>
        <strong>Effective date:</strong> 1 May 2026 &middot; <strong>Last updated:</strong> 9 May 2026
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>1. Information We Collect</h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>Account data:</strong> email address, display name, profile photo (via Firebase Auth or Google sign-in).</li>
          <li><strong>Usage data:</strong> pages visited, games played, showcase posts, leaderboard scores.</li>
          <li><strong>Payment data:</strong> PayStack processes all payments. We store transaction references, amounts, and order types — not card numbers.</li>
          <li><strong>Device data:</strong> browser type, IP address (for rate limiting and security), approximate location (country-level).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>2. How We Use Your Information</h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Provide and improve the platform (games, showcase, opportunities, challenges).</li>
          <li>Process payments and maintain financial records.</li>
          <li>Prevent abuse (rate limiting, moderation, security monitoring).</li>
          <li>Communicate with you (password resets, service updates).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>3. Data Sharing</h2>
        <p style={{ lineHeight: '1.8' }}>
          We do <strong>not</strong> sell personal data. We share data only with:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>Firebase / Google Cloud:</strong> authentication and data storage.</li>
          <li><strong>PayStack:</strong> payment processing.</li>
          <li><strong>Vercel:</strong> application hosting.</li>
          <li><strong>Law enforcement:</strong> when required by South African law.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>4. Data Retention</h2>
        <p style={{ lineHeight: '1.8' }}>
          Account data is retained until you delete your account. Financial records are retained for 7 years per South African tax regulations (SARS). Audit logs are retained for 1 year.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>5. Your Rights (POPIA)</h2>
        <p style={{ lineHeight: '1.8' }}>
          Under the Protection of Personal Information Act (POPIA), you have the right to:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Access your personal information.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data (subject to legal retention requirements).</li>
          <li>Object to the processing of your data.</li>
          <li>Lodge a complaint with the Information Regulator.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>6. Cookies & Local Storage</h2>
        <p style={{ lineHeight: '1.8' }}>
          We use local storage to save preferences (dark mode, age verification, cookie consent). Firebase Auth uses session cookies for authentication. We do not use third-party tracking cookies.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>7. Children&apos;s Privacy</h2>
        <p style={{ lineHeight: '1.8' }}>
          Intwana Hub requires users to be at least 13 years old. We do not knowingly collect data from children under 13. If we become aware that a child under 13 has provided personal information, we will delete it.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>8. Contact</h2>
        <p style={{ lineHeight: '1.8' }}>
          For privacy-related requests, contact us at: <strong>privacy@intwanahub.co.za</strong>
        </p>
      </section>
    </div>
  );
}

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary, #aaa)', marginBottom: '16px' }}>
        <strong>Effective date:</strong> 1 May 2026 &middot; <strong>Last updated:</strong> 9 May 2026
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>1. Acceptance</h2>
        <p style={{ lineHeight: '1.8' }}>
          By using Intwana Hub (&quot;the Platform&quot;), you agree to these Terms of Service. If you do not agree, do not use the Platform.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>2. Eligibility</h2>
        <p style={{ lineHeight: '1.8' }}>
          You must be at least 13 years old to use the Platform. Users under 18 must have parental or guardian consent. By creating an account, you confirm you meet these requirements.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>3. User Conduct</h2>
        <p style={{ lineHeight: '1.8' }}>You agree not to:</p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Post harmful, abusive, or illegal content.</li>
          <li>Impersonate others or misrepresent your identity.</li>
          <li>Attempt to hack, disrupt, or abuse the Platform.</li>
          <li>Use automated bots or scripts to manipulate leaderboards or votes.</li>
          <li>Violate any applicable South African or international law.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>4. Content Ownership</h2>
        <p style={{ lineHeight: '1.8' }}>
          You retain ownership of content you post (showcase projects, opportunity listings). By posting, you grant Intwana Hub a non-exclusive license to display it on the Platform.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>5. Payments & Refunds</h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Payments are processed via PayStack in South African Rand (ZAR).</li>
          <li>Creator boosts, sponsored challenges, and donations are non-refundable by default.</li>
          <li>Refund requests may be submitted and are reviewed on a case-by-case basis.</li>
          <li>Fraudulent transactions will be reversed and accounts may be suspended.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>6. Moderation</h2>
        <p style={{ lineHeight: '1.8' }}>
          We reserve the right to moderate, remove, or restrict content and accounts that violate these Terms. Content flagged by our automated screening is queued for manual review.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>7. Limitation of Liability</h2>
        <p style={{ lineHeight: '1.8' }}>
          The Platform is provided &quot;as is&quot;. We are not liable for any damages arising from your use of the Platform, including but not limited to lost data, lost revenue, or interruptions of service.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>8. Governing Law</h2>
        <p style={{ lineHeight: '1.8' }}>
          These Terms are governed by the laws of the Republic of South Africa. Disputes will be resolved under South African jurisdiction.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>9. Changes</h2>
        <p style={{ lineHeight: '1.8' }}>
          We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance. Significant changes will be communicated via the Platform.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>10. Contact</h2>
        <p style={{ lineHeight: '1.8' }}>
          Questions about these Terms? Contact us at: <strong>legal@intwanahub.co.za</strong>
        </p>
      </section>
    </div>
  );
}

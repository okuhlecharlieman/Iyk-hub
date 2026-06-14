import { LegalPageLayout, LegalSection, LegalParagraph, LegalList } from '../../components/ui/LegalSection';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate="1 May 2026" lastUpdated="9 May 2026">
      <LegalSection heading="1. Information We Collect">
        <LegalList>
          <li><strong>Account data:</strong> email address, display name, profile photo (via Firebase Auth or Google sign-in).</li>
          <li><strong>Usage data:</strong> pages visited, games played, showcase posts, leaderboard scores.</li>
          <li><strong>Payment data:</strong> PayStack processes all payments. We store transaction references, amounts, and order types — not card numbers.</li>
          <li><strong>Device data:</strong> browser type, IP address (for rate limiting and security), approximate location (country-level).</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="2. How We Use Your Information">
        <LegalList>
          <li>Provide and improve the platform (games, showcase, opportunities, challenges).</li>
          <li>Process payments and maintain financial records.</li>
          <li>Prevent abuse (rate limiting, moderation, security monitoring).</li>
          <li>Communicate with you (password resets, service updates).</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="3. Data Sharing">
        <LegalParagraph>
          We do <strong>not</strong> sell personal data. We share data only with:
        </LegalParagraph>
        <LegalList>
          <li><strong>Firebase / Google Cloud:</strong> authentication and data storage.</li>
          <li><strong>PayStack:</strong> payment processing.</li>
          <li><strong>Vercel:</strong> application hosting.</li>
          <li><strong>Law enforcement:</strong> when required by South African law.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="4. Data Retention">
        <LegalParagraph>
          Account data is retained until you delete your account. Financial records are retained for 7 years per South African tax regulations (SARS). Audit logs are retained for 1 year.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. Your Rights (POPIA)">
        <LegalParagraph>
          Under the Protection of Personal Information Act (POPIA), you have the right to:
        </LegalParagraph>
        <LegalList>
          <li>Access your personal information.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data (subject to legal retention requirements).</li>
          <li>Object to the processing of your data.</li>
          <li>Lodge a complaint with the Information Regulator.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="6. Cookies & Local Storage">
        <LegalParagraph>
          We use local storage to save preferences (dark mode, age verification, cookie consent). Firebase Auth uses session cookies for authentication. We do not use third-party tracking cookies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="7. Children&apos;s Privacy">
        <LegalParagraph>
          Intwana Hub requires users to be at least 13 years old. We do not knowingly collect data from children under 13. If we become aware that a child under 13 has provided personal information, we will delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <LegalParagraph>
          For privacy-related requests, contact us at: <strong>privacy@intwanahub.co.za</strong>
        </LegalParagraph>
      </LegalSection>
    </LegalPageLayout>
  );
}

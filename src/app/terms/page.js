import { LegalPageLayout, LegalSection, LegalParagraph, LegalList } from '../../components/ui/LegalSection';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" effectiveDate="1 May 2026" lastUpdated="9 May 2026">
      <LegalSection heading="1. Acceptance">
        <LegalParagraph>
          By using Intwana Hub (&quot;the Platform&quot;), you agree to these Terms of Service. If you do not agree, do not use the Platform.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="2. Eligibility">
        <LegalParagraph>
          You must be at least 13 years old to use the Platform. Users under 18 must have parental or guardian consent. By creating an account, you confirm you meet these requirements.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="3. User Conduct">
        <LegalParagraph>You agree not to:</LegalParagraph>
        <LegalList>
          <li>Post harmful, abusive, or illegal content.</li>
          <li>Impersonate others or misrepresent your identity.</li>
          <li>Attempt to hack, disrupt, or abuse the Platform.</li>
          <li>Use automated bots or scripts to manipulate leaderboards or votes.</li>
          <li>Violate any applicable South African or international law.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="4. Content Ownership">
        <LegalParagraph>
          You retain ownership of content you post (showcase projects, opportunity listings). By posting, you grant Intwana Hub a non-exclusive license to display it on the Platform.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. Payments & Refunds">
        <LegalList>
          <li>Payments are processed via PayStack in South African Rand (ZAR).</li>
          <li>Creator boosts, sponsored challenges, and donations are non-refundable by default.</li>
          <li>Refund requests may be submitted and are reviewed on a case-by-case basis.</li>
          <li>Fraudulent transactions will be reversed and accounts may be suspended.</li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="6. Moderation">
        <LegalParagraph>
          We reserve the right to moderate, remove, or restrict content and accounts that violate these Terms. Content flagged by our automated screening is queued for manual review.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="7. Limitation of Liability">
        <LegalParagraph>
          The Platform is provided &quot;as is&quot;. We are not liable for any damages arising from your use of the Platform, including but not limited to lost data, lost revenue, or interruptions of service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="8. Governing Law">
        <LegalParagraph>
          These Terms are governed by the laws of the Republic of South Africa. Disputes will be resolved under South African jurisdiction.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="9. Changes">
        <LegalParagraph>
          We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance. Significant changes will be communicated via the Platform.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <LegalParagraph>
          Questions about these Terms? Contact us at: <strong>legal@intwanahub.co.za</strong>
        </LegalParagraph>
      </LegalSection>
    </LegalPageLayout>
  );
}

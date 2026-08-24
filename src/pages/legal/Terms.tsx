import { useTranslation } from 'react-i18next';
import { LegalLayout } from '@/components/legal/LegalLayout';

const CONTACT_EMAIL = 'legal@letsgetclose.app';

const Terms = () => {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.termsTitle')} lastUpdated="August 24, 2026">
      <section>
        <h2>1. Who We Are and What These Terms Cover</h2>
        <p>
          Welcome to Let's Get Close ("the Service", "we", "us"). Let's Get Close is an online
          card game and conversation experience designed for couples, offering guided questions,
          real-time game rooms, and optional AI-generated relationship insights. These Terms of
          Service ("Terms") govern your access to and use of the Service, including our website,
          game rooms, credit purchases, and analysis features. By creating an account or using the
          Service, you agree to be bound by these Terms and by our Privacy Policy.
        </p>
      </section>

      <section>
        <h2>2. Age Requirement (18+)</h2>
        <p>
          The Service contains mature, intimate, and adult-oriented themes and is strictly intended
          for adults. You must be at least 18 years of age (or the age of majority in your
          jurisdiction, if higher) to create an account or use the Service. By registering, you
          represent and warrant that you meet this requirement. We may suspend or terminate any
          account we reasonably believe belongs to a minor.
        </p>
      </section>

      <section>
        <h2>3. Your Account</h2>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must provide accurate information and keep it up to date.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>Notify us promptly at {CONTACT_EMAIL} if you suspect unauthorized use of your account.</li>
        </ul>
      </section>

      <section>
        <h2>4. The Game and Your Content</h2>
        <p>
          During game sessions you and your partner may submit free-text answers, evaluations, and
          other content ("User Content"). You retain ownership of your User Content. You grant us a
          limited, non-exclusive license to store and process User Content solely to operate the
          Service — for example, to display your answers to your session partner, to generate
          session reports, and (where you use those features) to produce AI-generated analysis.
        </p>
        <p>
          You agree not to submit content that is unlawful, that infringes the rights of others, or
          that involves any person who has not consented to participate. Both participants in a
          room should take part freely and voluntarily; the Service is built on mutual consent.
        </p>
      </section>

      <section>
        <h2>5. AI-Generated Insights — Not Professional Advice</h2>
        <p>
          Some features use third-party artificial intelligence services (including OpenAI) to
          generate compatibility scores, insights, and suggestions based on your session responses.
          These outputs are for entertainment and self-reflection purposes only. They are not
          psychological, medical, legal, or relationship-counseling advice, and they may be
          inaccurate or incomplete. Do not rely on them for decisions about your health,
          relationship, or wellbeing; consult a qualified professional where appropriate.
        </p>
      </section>

      <section>
        <h2>6. Credits and Payments</h2>
        <p>
          Certain features require credits, sold in one-time packs and processed securely by our
          payment provider, Stripe. We do not store your full card details. Prices are shown before
          purchase and may change prospectively at any time. Credits are a limited, non-transferable
          license to use paid features; they have no cash value and cannot be exchanged for cash
          except where required by law. Refunds are handled as described in our{' '}
          <a href="/refund">Refund Policy</a>.
        </p>
      </section>

      <section>
        <h2>7. Acceptable Use</h2>
        <ul>
          <li>Do not use the Service for any unlawful purpose or in violation of these Terms.</li>
          <li>Do not attempt to access other users' accounts, rooms, or data.</li>
          <li>Do not probe, scan, overload, disrupt, or reverse-engineer the Service.</li>
          <li>Do not use the Service to harass, coerce, or harm any person.</li>
          <li>Do not resell, scrape, or commercially exploit the Service without our written consent.</li>
        </ul>
      </section>

      <section>
        <h2>8. Intellectual Property</h2>
        <p>
          The Service — including its questions, card decks, design, branding, and software — is
          owned by us or our licensors and is protected by intellectual-property laws. Except for
          your own User Content, no rights are granted to you other than the limited right to use
          the Service as intended.
        </p>
      </section>

      <section>
        <h2>9. Termination</h2>
        <p>
          You may stop using the Service and request deletion of your account at any time. We may
          suspend or terminate access if you breach these Terms, if required by law, or if we
          discontinue the Service. Upon termination, unused credits may be forfeited except where a
          refund is required by law or by our Refund Policy.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers and Limitation of Liability</h2>
        <p>
          The Service is provided "as is" and "as available". To the maximum extent permitted by
          law, we disclaim all warranties, express or implied, and we will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or for loss of data,
          arising from your use of the Service. Our total aggregate liability for any claim will
          not exceed the greater of the amount you paid us in the twelve months preceding the claim
          or EUR 50. Nothing in these Terms limits liability that cannot be limited under
          applicable law, including your statutory consumer rights.
        </p>
      </section>

      <section>
        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we will notify
          you (for example by email or an in-app notice) before the changes take effect. Continued
          use of the Service after the effective date constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Terms;

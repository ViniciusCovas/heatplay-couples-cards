import { useTranslation } from 'react-i18next';
import { LegalLayout } from '@/components/legal/LegalLayout';

const CONTACT_EMAIL = 'legal@letsgetclose.app';

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.privacyTitle')} lastUpdated="August 24, 2026">
      <section>
        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how Let's Get Close ("we", "us") collects, uses, and
          protects your personal data when you use our couples card game and related services. We
          designed the Service around intimacy between two consenting adults, so we treat the data
          you share with particular care. This policy is written with the EU General Data
          Protection Regulation (GDPR) and the Brazilian Lei Geral de Proteção de Dados (LGPD) in
          mind, and applies to all users wherever located.
        </p>
      </section>

      <section>
        <h2>2. Data We Collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> email address, hashed password (or Google sign-in
            identifier), account role, language preference, and account timestamps.
          </li>
          <li>
            <strong>Game data:</strong> room codes, session levels, question cards shown, your
            free-text responses, your evaluations of your partner's responses, and session timing.
            Free-text responses may reveal intimate details about your relationship or private
            life; we treat this as sensitive content and process it only as described below.
          </li>
          <li>
            <strong>AI analysis data:</strong> when you request an analysis, your session responses
            are processed to generate compatibility insights and reports.
          </li>
          <li>
            <strong>Payment data:</strong> credit balances and purchase records. Card details are
            collected and processed by Stripe; we never see or store your full card number.
          </li>
          <li>
            <strong>Technical data:</strong> basic device/browser information and, if analytics are
            enabled, privacy-light usage events (page views and feature events). We never send the
            text of your game responses to analytics tools.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Purposes and Legal Bases</h2>
        <ul>
          <li>
            <strong>Providing the Service</strong> (running game rooms, syncing with your partner,
            showing reports) — performance of a contract (GDPR Art. 6(1)(b); LGPD Art. 7 V).
          </li>
          <li>
            <strong>AI-generated insights</strong> — performed at your request as part of the
            Service; where consent is required for processing intimate content, we rely on your
            explicit action of requesting the analysis (GDPR Art. 6(1)(a)/9(2)(a); LGPD Art. 11).
          </li>
          <li>
            <strong>Payments and fraud prevention</strong> — contract performance and legal
            obligation.
          </li>
          <li>
            <strong>Transactional email</strong> (account confirmations, password resets, emailed
            reports) — contract performance.
          </li>
          <li>
            <strong>Service improvement and security</strong> — our legitimate interests, balanced
            against your rights.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Processors and International Transfers</h2>
        <p>We share data only with service providers that help us run the Service:</p>
        <ul>
          <li><strong>Supabase</strong> — database, authentication, and hosting infrastructure.</li>
          <li>
            <strong>OpenAI</strong> — processes session responses to generate AI insights when you
            request an analysis. We send only what is needed for the analysis; OpenAI's API terms
            prohibit using this data to train their models.
          </li>
          <li><strong>Stripe</strong> — payment processing.</li>
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li>
            <strong>PostHog</strong> (optional) — privacy-light product analytics, if enabled.
          </li>
        </ul>
        <p>
          Some providers process data outside your country (including in the United States). Where
          that happens, we rely on appropriate safeguards such as Standard Contractual Clauses or
          adequacy decisions. We never sell your personal data.
        </p>
      </section>

      <section>
        <h2>5. Sharing Within a Game Session</h2>
        <p>
          The Service is a two-player experience: answers you submit in a room are shown to the
          other participant in that room, and session reports and analyses are visible to both
          participants. Only join rooms with a partner you trust, and only share what you are
          comfortable with them seeing.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <ul>
          <li>Account data: kept while your account is active.</li>
          <li>
            Game responses, evaluations, and analyses: kept while your account is active so you can
            revisit your history and insights; deleted or anonymized when your account is deleted.
          </li>
          <li>Payment records: kept as long as required by tax and accounting law.</li>
          <li>Inactive game rooms may be expired and cleaned up automatically.</li>
        </ul>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>
          Subject to applicable law (including GDPR and LGPD), you have the right to access,
          correct, export (portability), restrict, object to the processing of, and delete your
          personal data, and to withdraw consent at any time without affecting prior processing.
          You also have the right to lodge a complaint with your local data-protection authority
          (in Brazil, the ANPD; in the EU, your national supervisory authority).
        </p>
        <p>
          To exercise any of these rights — including full account and data deletion — email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We respond within the timeframes
          required by law (generally within 30 days).
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use industry-standard measures to protect your data, including encryption in transit
          (TLS), row-level security on our database, scoped access controls, and secure credential
          storage. No system is perfectly secure; if a breach affecting your data occurs, we will
          notify you and the relevant authorities as required by law.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          The Service is strictly for adults aged 18 or older. We do not knowingly collect data
          from minors. If you believe a minor has created an account, contact us and we will delete
          it.
        </p>
      </section>

      <section>
        <h2>10. Changes and Contact</h2>
        <p>
          We may update this policy from time to time and will notify you of material changes. Data
          controller contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Privacy;

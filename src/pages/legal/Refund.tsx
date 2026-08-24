import { useTranslation } from 'react-i18next';
import { LegalLayout } from '@/components/legal/LegalLayout';

const CONTACT_EMAIL = 'legal@letsgetclose.app';

const Refund = () => {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.refundTitle')} lastUpdated="August 24, 2026">
      <section>
        <h2>1. What You Are Buying</h2>
        <p>
          Let's Get Close sells one-time credit packs. Each credit unlocks a paid game session and
          its associated features (such as AI-generated analysis). Payments are processed securely
          by Stripe. Credits are delivered to your account immediately after your payment is
          verified.
        </p>
      </section>

      <section>
        <h2>2. Unused Credits</h2>
        <p>
          If you are unhappy with your purchase, you may request a refund of <strong>unused</strong>{' '}
          credits within <strong>14 days</strong> of purchase. Refunds are issued to the original
          payment method, prorated to the number of credits not yet used. To request a refund,
          email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address on
          your account, including your purchase date and (if available) your Stripe receipt.
        </p>
      </section>

      <section>
        <h2>3. Used Credits and Digital Content</h2>
        <p>
          A credit is considered used once a game session has been started with it. Because a used
          credit corresponds to digital content and services that have already been delivered
          (questions, real-time session, analysis), used credits are generally non-refundable. For
          consumers in the EU/EEA and UK: by starting a session you request immediate performance of
          the digital service and acknowledge that you thereby lose the statutory 14-day right of
          withdrawal for that portion of the purchase. Equivalent consumer rights in other
          jurisdictions (including under Brazilian consumer law) are respected where they apply.
        </p>
      </section>

      <section>
        <h2>4. Faulty or Undelivered Purchases</h2>
        <ul>
          <li>
            If you were charged but credits were not added to your account, use the "verify again"
            option on the payment confirmation page, then contact us if the problem persists — we
            will add the credits or refund you in full.
          </li>
          <li>
            If a paid session fails due to a technical fault on our side (for example, the session
            could not be completed or the analysis could not be generated), contact us and we will
            restore the credit or refund it.
          </li>
          <li>Duplicate or accidental charges are refunded in full.</li>
        </ul>
      </section>

      <section>
        <h2>5. How Refunds Are Processed</h2>
        <p>
          Approved refunds are issued through Stripe to your original payment method. Depending on
          your bank, it may take 5–10 business days for the amount to appear on your statement. We
          aim to respond to all refund requests within 3 business days.
        </p>
      </section>

      <section>
        <h2>6. Chargebacks</h2>
        <p>
          Please contact us before opening a dispute with your bank — most issues can be resolved
          faster directly. Accounts associated with fraudulent chargebacks may be suspended.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          For any billing question, contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Refund;

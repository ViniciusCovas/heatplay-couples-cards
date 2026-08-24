import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LegalFooterProps {
  className?: string;
}

/** Small footer with links to the legal pages and the 18+ notice. */
export const LegalFooter = ({ className }: LegalFooterProps) => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={cn('py-6 text-center text-xs text-muted-foreground space-y-2', className)}>
      <nav className="flex items-center justify-center gap-4 flex-wrap">
        <Link to="/terms" className="hover:text-primary transition-colors">
          {t('legal.termsTitle')}
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:text-primary transition-colors">
          {t('legal.privacyTitle')}
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/refund" className="hover:text-primary transition-colors">
          {t('legal.refundTitle')}
        </Link>
      </nav>
      <p>
        {t('legal.adultsOnly')} · © {year} Let's Get Close
      </p>
    </footer>
  );
};

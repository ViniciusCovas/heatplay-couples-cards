import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the legal pages (/terms, /privacy, /refund).
 * Body content is authored in English; a note explains that translations
 * are available on request. Titles and navigation are localized.
 */
export const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('legal.backHome')}
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            <h1 className="text-3xl font-heading font-bold text-primary mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t('legal.lastUpdated')}: {lastUpdated}
            </p>

            <div className="flex items-start gap-3 rounded-lg bg-accent/10 border border-accent/20 p-4 mb-8">
              <Languages className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{t('legal.translationNote')}</p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-2 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary [&_a]:underline">
              {children}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <Link className="hover:text-primary transition-colors" to="/terms">
            {t('legal.termsTitle')}
          </Link>
          <Link className="hover:text-primary transition-colors" to="/privacy">
            {t('legal.privacyTitle')}
          </Link>
          <Link className="hover:text-primary transition-colors" to="/refund">
            {t('legal.refundTitle')}
          </Link>
        </div>
      </div>
    </div>
  );
};

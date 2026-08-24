import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, RefreshCw, Crown, Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { usePremium } from '@/hooks/usePremium';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const SUPPORT_EMAIL = 'legal@letsgetclose.app';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { verifyPayment } = useCredits();
  const { refresh: refreshPremium } = usePremium();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const sessionId = searchParams.get('session_id');
  const credits = searchParams.get('credits');
  const isSubscription = searchParams.get('mode') === 'subscription';

  const handleVerification = async (isRetry = false) => {
    if (!sessionId) {
      setError(t('paymentSuccess.errors.noSessionId', 'No payment session ID was found in the URL.'));
      setVerifying(false);
      return;
    }

    if (isRetry) {
      setVerifying(true);
      setError(null);
    }

    try {
      logger.debug(`Attempting payment verification for session: ${sessionId}, retry: ${retryCount}`);
      const success = await verifyPayment(sessionId);
      
      if (success) {
        setVerified(true);
        setError(null);
      } else {
        setError(t('paymentSuccess.errors.failed', 'We could not verify your payment. If your card was charged, contact support and we will sort it out.'));
      }
    } catch (error) {
      logger.error('Payment verification failed:', error);
      setError(t('paymentSuccess.errors.retry', 'Something went wrong while verifying your payment. Please try again.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleVerification(true);
  };

  useEffect(() => {
    logger.debug('PaymentSuccess component mounted', { sessionId, credits, isSubscription });
    if (isSubscription) {
      // Subscription checkouts are confirmed by the Stripe webhook; there is
      // no credit verification to run. Just refresh the premium state.
      setVerifying(false);
      setVerified(true);
      refreshPremium();
      return;
    }
    handleVerification();
  }, [sessionId]);

  const handleContinue = () => {
    navigate('/');
  };

  if (isSubscription) {
    return (
      <div className="min-h-screen romantic-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-primary/30">
          <CardHeader>
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <CardTitle>{t('premium.welcome.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('premium.welcome.subtitle')}</p>
            <p className="text-sm text-primary font-medium">{t('premium.welcome.partnerHint')}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/create-room')} className="w-full btn-gradient-primary text-white border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('premium.welcome.cta')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/premium')} className="w-full">
                {t('premium.welcome.goPremiumPage')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen romantic-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {verifying ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <CardTitle>{t('paymentSuccess.verifying.title', 'Verifying your payment...')}</CardTitle>
            </>
          ) : verified ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-primary" />
              <CardTitle className="text-primary-ink">{t('paymentSuccess.success.title', 'Payment successful!')}</CardTitle>
            </>
          ) : (
            <>
              <div className="h-12 w-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="text-destructive text-xl" aria-hidden="true">✕</span>
              </div>
              <CardTitle className="text-destructive">{t('paymentSuccess.error.title', 'Verification problem')}</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verifying ? (
            <p className="text-muted-foreground">
              {t('paymentSuccess.verifying.description', 'We are confirming your payment. This can take a few seconds...')}
              {retryCount > 0 && <span className="block text-sm mt-1">{t('paymentSuccess.attempt', 'Attempt {{count}}', { count: retryCount + 1 })}</span>}
            </p>
          ) : verified ? (
            <>
              <p className="text-muted-foreground">
                {credits && t('paymentSuccess.success.creditsAdded', { count: Number(credits), defaultValue: '{{count}} credits have been added to your account.' })}
              </p>
              <p className="text-sm text-primary-ink font-medium">
                {t('paymentSuccess.success.hint', 'You can start a session with your partner right now!')}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                {error || t('paymentSuccess.error.generic', 'There was a problem verifying your payment.')}
              </p>
              <p className="text-sm text-secondary">
                {t('paymentSuccess.error.reassurance', 'If your card was charged, your credits will appear shortly. You can verify again or contact us and we will fix it.')}
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-left space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t('paymentSuccess.error.supportIntro', 'Need help? Email us and quote your session reference:')}
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Payment verification issue')}&body=${encodeURIComponent(`Session ID: ${sessionId ?? 'n/a'}`)}`}
                  className="block text-xs font-medium text-primary-ink underline break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {t('paymentSuccess.error.sessionRef', 'Session ID')}: {sessionId || t('paymentSuccess.error.missingSessionId', 'missing')}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {!verified && !verifying && sessionId && (
              <Button
                onClick={handleRetry}
                variant="outline"
                disabled={verifying}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('paymentSuccess.verifyAgain', 'Verify again')}
              </Button>
            )}

            <Button
              onClick={handleContinue}
              className={`btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100 ${verified || !sessionId ? "w-full" : "flex-1"}`}
              disabled={verifying}
            >
              {verified ? t('paymentSuccess.continue', 'Continue') : t('paymentSuccess.goHome', 'Go to home')}
            </Button>
          </div>

          {verified && (
            <Button variant="link" asChild className="text-sm text-primary-ink">
              <Link to="/insights">{t('paymentSuccess.viewInsights', 'Explore your connection insights')}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
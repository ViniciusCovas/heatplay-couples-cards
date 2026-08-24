import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, RefreshCw, Crown, Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { usePremium } from '@/hooks/usePremium';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

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
      setError('No se encontró ID de sesión en la URL');
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
        setError('La verificación del pago falló. Por favor, contacta soporte si tu tarjeta fue cobrada.');
      }
    } catch (error) {
      logger.error('Payment verification failed:', error);
      setError('Error al verificar el pago. Por favor, intenta de nuevo.');
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
      <div className="min-h-screen bg-gradient-to-br from-romantic-primary/5 to-romantic-accent/5 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-romantic-primary/5 to-romantic-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {verifying ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-romantic-primary animate-spin" />
              <CardTitle>Verificando tu pago...</CardTitle>
            </>
          ) : verified ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle className="text-green-700">¡Pago exitoso!</CardTitle>
            </>
          ) : (
            <>
              <div className="h-12 w-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-500 text-xl">✕</span>
              </div>
              <CardTitle className="text-red-700">Error en la verificación</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verifying ? (
            <p className="text-muted-foreground">
              Estamos confirmando tu pago. Esto puede tomar unos segundos...
              {retryCount > 0 && <span className="block text-sm mt-1">Intento {retryCount + 1}</span>}
            </p>
          ) : verified ? (
            <>
              <p className="text-muted-foreground">
                {credits && `Se han añadido ${credits} crédito${credits !== '1' ? 's' : ''} a tu cuenta.`}
              </p>
              <p className="text-sm text-green-600 font-medium">
                ¡Ya puedes empezar a crear sesiones con tu pareja!
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                {error || "Hubo un problema al verificar tu pago."}
              </p>
              <p className="text-sm text-orange-600">
                Si tu tarjeta fue cobrada, tus créditos aparecerán pronto. Puedes intentar verificar de nuevo o contactar soporte.
              </p>
              {!sessionId && (
                <p className="text-xs text-red-500">
                  URL inválida - falta el ID de sesión de pago.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {!verified && !verifying && sessionId && (
              <Button 
                onClick={handleRetry}
                variant="outline"
                disabled={verifying}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar de nuevo
              </Button>
            )}
            
            <Button 
              onClick={handleContinue}
              className={verified || !sessionId ? "w-full" : "flex-1"}
              disabled={verifying}
            >
              {verified ? "Continuar" : "Ir al inicio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
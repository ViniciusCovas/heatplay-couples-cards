import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyPayment } = useCredits();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  const sessionId = searchParams.get('session_id');
  const credits = searchParams.get('credits');

  useEffect(() => {
    const handleVerification = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const success = await verifyPayment(sessionId);
        setVerified(success);
      } catch (error) {
        console.error('Payment verification failed:', error);
      } finally {
        setVerifying(false);
      }
    };

    handleVerification();
  }, [sessionId, verifyPayment]);

  const handleContinue = () => {
    navigate('/');
  };

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
            <p className="text-muted-foreground">
              Hubo un problema al verificar tu pago. Por favor, contacta soporte si los créditos no aparecen en tu cuenta.
            </p>
          )}

          <Button 
            onClick={handleContinue}
            className="w-full"
            disabled={verifying}
          >
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
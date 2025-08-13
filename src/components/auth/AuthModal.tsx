import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Users, Mail, ArrowRight, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const { signInWithGoogle, loading } = useAuth();
  const { t } = useTranslation();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || t('errors.authFailed'));
        return;
      }
      
      // Success will be handled by the auth state change
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t('errors.authFailed'));
    }
  };

  const handleEmailAuth = () => {
    onOpenChange(false);
    // Navigate to traditional auth page
    window.location.href = '/auth';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('auth.modal.title', 'Sign in to Continue')}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {t('auth.modal.subtitle', 'Quick and secure authentication to create your room')}
          </DialogDescription>
        </DialogHeader>
        
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-4 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>

            <Button 
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-lg font-semibold btn-gradient-primary"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.modal.continueWithGoogle', 'Continue with Google')}
              <ArrowRight className="w-5 h-5 ml-3" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('auth.modal.or', 'Or')}
                </span>
              </div>
            </div>

            <Button 
              onClick={handleEmailAuth}
              variant="outline"
              className="w-full h-12 text-lg font-semibold"
            >
              <Mail className="w-5 h-5 mr-3" />
              {t('auth.modal.useEmail', 'Use Email Instead')}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                {t('auth.modal.termsText', 'By continuing, you agree to our Terms of Service and Privacy Policy')}
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
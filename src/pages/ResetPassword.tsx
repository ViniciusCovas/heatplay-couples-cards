import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LockKeyhole } from 'lucide-react';
import { logger } from '@/utils/logger';

/**
 * Landing page for Supabase password-recovery links.
 * The recovery token in the URL is exchanged for a session by supabase-js;
 * we wait for that session and then let the user set a new password via
 * supabase.auth.updateUser.
 */
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasRecoverySession(true);
      }
      // Give the auth listener a moment to process the recovery hash
      setTimeout(() => setCheckingSession(false), 1500);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.reset.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.reset.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          title: t('auth.toast.errorTitle'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.toast.successTitle'),
          description: t('auth.reset.passwordUpdated'),
        });
        navigate('/');
      }
    } catch (error) {
      logger.error('Password update failed', error);
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.toast.unexpected'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen romantic-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <LockKeyhole className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {t('auth.reset.newPasswordTitle')}
          </CardTitle>
          <CardDescription>{t('auth.reset.newPasswordSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {checkingSession ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !hasRecoverySession ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-muted-foreground">{t('auth.reset.invalidLink')}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">{t('auth.reset.backToSignIn')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('auth.reset.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth.passwordPlaceholderSignUp')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('auth.reset.confirmPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth.reset.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100" disabled={loading}>
                {loading ? t('auth.reset.updating') : t('auth.reset.updatePassword')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { LegalFooter } from '@/components/navigation/LegalFooter';
import { track } from '@/lib/analytics';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, user, isAnonymous } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  // A guest (anonymous) session still counts as `user`, but those visitors are
  // here precisely to finish their account — never bounce them home.
  const hasPermanentAccount = !!user && !isAnonymous;

  // /auth?upgrade=1 (from the "save your account" prompts) opens on Sign up.
  const defaultTab = isAnonymous || searchParams.get('upgrade') === '1' ? 'signup' : 'signin';

  useEffect(() => {
    if (hasPermanentAccount) {
      navigate('/');
    }
  }, [hasPermanentAccount, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: t('auth.toast.errorTitle'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.toast.successTitle'),
          description: t('auth.toast.signedIn'),
        });
        window.location.href = '/';
      }
    } catch (error) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.toast.unexpected'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ageConfirmed) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.ageGate.required'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // When the visitor is on a guest session this upgrades it in place: the
      // same auth.uid() gains an email + password, so their rooms, credits and
      // analyses carry over untouched.
      const { error, upgraded } = await signUp(email, password);
      if (error) {
        toast({
          title: t('auth.toast.errorTitle'),
          description: error.message,
          variant: "destructive",
        });
      } else if (upgraded) {
        track('signup_completed', { upgraded_from_anonymous: true });
        toast({
          title: t('auth.toast.successTitle'),
          description: t(
            'auth.toast.accountSaved',
            'Your account is saved. Everything you played is still here.'
          ),
        });
        navigate('/');
      } else {
        track('signup_completed');
        toast({
          title: t('auth.toast.successTitle'),
          description: t('auth.toast.checkEmail'),
        });
      }
    } catch (error) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.toast.unexpected'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({
          title: t('auth.toast.errorTitle'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: t('auth.toast.successTitle'),
          description: t('auth.reset.emailSentDescription'),
        });
      }
    } catch (error) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.toast.unexpected'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen romantic-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {showForgotPassword ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-primary">
                {t('auth.reset.title')}
              </CardTitle>
              <CardDescription>
                {t('auth.reset.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.reset.emailSentDescription')}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('auth.reset.backToSignIn')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">{t('auth.email')}</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100" disabled={loading}>
                    {loading ? t('auth.reset.sending') : t('auth.reset.sendLink')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('auth.reset.backToSignIn')}
                  </Button>
                </form>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-primary">
                {isAnonymous ? t('auth.upgrade.title', 'Save your account') : t('auth.title')}
              </CardTitle>
              <CardDescription>
                {isAnonymous
                  ? t(
                      'auth.upgrade.subtitle',
                      "You're playing as a guest. Add an email and password to keep your credits, rooms and analyses."
                    )
                  : t('auth.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">{t('auth.email')}</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">{t('auth.password')}</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder={t('auth.passwordPlaceholderSignIn')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary-ink underline-offset-4 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                    <Button type="submit" className="w-full btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100" disabled={loading}>
                      {loading ? t('auth.signingIn') : t('auth.signIn')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.email')}</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.password')}</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('auth.passwordPlaceholderSignUp')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="flex items-start gap-3 rounded-md border border-input p-3">
                      <Checkbox
                        id="age-confirm"
                        checked={ageConfirmed}
                        onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="age-confirm"
                        className="text-sm font-normal leading-relaxed text-muted-foreground cursor-pointer"
                      >
                        <Trans i18nKey="auth.ageGate.label">
                          I confirm I am 18 years of age or older and accept the <Link to="/terms" className="text-primary underline" onClick={(e) => e.stopPropagation()}>Terms of Service</Link> and <Link to="/privacy" className="text-primary underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>
                        </Trans>
                      </Label>
                    </div>
                    <Button type="submit" className="w-full btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100" disabled={loading || !ageConfirmed}>
                      {loading
                        ? t('auth.creatingAccount')
                        : isAnonymous
                          ? t('auth.saveAccount.cta', 'Save my account')
                          : t('auth.signUp')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        )}
      </Card>

      <LegalFooter className="mt-4" />
    </div>
  );
};

export default Auth;

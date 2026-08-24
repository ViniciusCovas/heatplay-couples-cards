import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Check, Crown, Heart, Sparkles, Loader2, Link2, CheckCircle2, Infinity as InfinityIcon,
  Brain, History, Users2, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';
import { logger } from '@/utils/logger';
import { AuthModal } from '@/components/auth/AuthModal';
import { LegalFooter } from '@/components/navigation/LegalFooter';

type Plan = 'monthly' | 'yearly';

const PRICES: Record<Plan, string> = { monthly: '€6.99', yearly: '€39.99' };

const Premium = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, subscription, isOwner, linkPartner } = usePremium();

  const [plan, setPlan] = useState<Plan>('yearly');
  const [checkingOut, setCheckingOut] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    track('premium_viewed');
  }, []);

  const startCheckout = async (selected: Plan) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { mode: 'subscription', plan: selected },
      });
      if (error) throw error;
      if (data?.url) {
        track('premium_checkout_started', { plan: selected });
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      logger.error('Premium checkout failed', err);
      toast.error(t('premium.partner.errors.unknown'));
      setCheckingOut(false);
    }
  };

  const handleLinkPartner = async () => {
    const email = partnerEmail.trim();
    if (!email) return;
    setLinking(true);
    const errorCode = await linkPartner(email);
    setLinking(false);
    if (errorCode === null) {
      track('partner_linked');
      toast.success(t('premium.partner.success'));
      setPartnerEmail('');
    } else {
      const known = ['partner_not_found', 'cannot_link_self', 'no_active_subscription', 'not_authenticated'];
      toast.error(t(`premium.partner.errors.${known.includes(errorCode) ? errorCode : 'unknown'}`));
    }
  };

  const premiumFeatures: { icon: React.ElementType; key: string }[] = [
    { icon: InfinityIcon, key: 'unlimited' },
    { icon: Layers, key: 'allLevels' },
    { icon: Brain, key: 'weeklyAnalysis' },
    { icon: History, key: 'history' },
    { icon: Users2, key: 'partner' },
  ];

  const renewsDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language)
    : null;

  return (
    <div className="min-h-screen romantic-background relative overflow-hidden">
      {/* Ambient background, matching Home */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      <div className="container mx-auto px-4 py-10 relative z-10 max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Crown className="w-4 h-4" />
            <span>{t('premium.tagline')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-semibold text-foreground">
            {t('premium.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {t('premium.subtitle')}
          </p>
        </div>

        {isPremium ? (
          /* ---------- Active subscriber view ---------- */
          <div className="max-w-xl mx-auto space-y-6">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                <CardTitle>{t('premium.active.title')}</CardTitle>
                <CardDescription>
                  {t('premium.active.subtitle')}
                  {renewsDate && (
                    <span className="block mt-1">{t('premium.active.renewsOn', { date: renewsDate })}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOwner && (
                  subscription?.partner_user_id ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                      <Heart className="w-4 h-4" />
                      {t('premium.partner.linked')}
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-primary/20 p-4 bg-background/60">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Link2 className="w-4 h-4 text-primary" />
                        {t('premium.partner.title')}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('premium.partner.description')}</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="email"
                          value={partnerEmail}
                          onChange={(e) => setPartnerEmail(e.target.value)}
                          placeholder={t('premium.partner.placeholder')}
                          className="flex-1"
                        />
                        <Button onClick={handleLinkPartner} disabled={linking || !partnerEmail.trim()}>
                          {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : t('premium.partner.cta')}
                        </Button>
                      </div>
                    </div>
                  )
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {t('premium.active.manageHint')}
                </p>
                <Button className="w-full btn-gradient-primary text-white border-0" onClick={() => navigate('/create-room')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('premium.welcome.cta')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ---------- Pricing view ---------- */
          <>
            {/* Monthly / yearly toggle */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="inline-flex rounded-full bg-muted p-1">
                <button
                  onClick={() => setPlan('monthly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    plan === 'monthly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t('premium.billing.monthly')}
                </button>
                <button
                  onClick={() => setPlan('yearly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 ${
                    plan === 'yearly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t('premium.billing.yearly')}
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0 text-[11px] px-2">
                    {t('premium.billing.yearlyBadge')}
                  </Badge>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
              {/* Free plan */}
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl">{t('premium.free.title')}</CardTitle>
                  <div className="text-3xl font-bold text-foreground">{t('premium.free.price')}</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(['spark', 'firstLevel', 'credits'] as const).map((k) => (
                      <li key={k} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 mt-0.5 text-muted-foreground/70 flex-shrink-0" />
                        {t(`premium.free.features.${k}`)}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Premium plan */}
              <Card className="relative border-primary/40 shadow-xl bg-gradient-to-br from-primary/5 via-background to-secondary/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white border-0 shadow">
                    {t('premium.plan.popular')}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    {t('premium.title')}
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{PRICES[plan]}</span>
                    <span className="text-muted-foreground text-sm">
                      {plan === 'monthly' ? t('premium.perMonth') : t('premium.perYear')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {premiumFeatures.map(({ icon: Icon, key }) => (
                      <li key={key} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </span>
                        {t(`premium.plan.features.${key}`)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full h-12 text-base font-semibold btn-gradient-primary text-white border-0 shadow-lg"
                    onClick={() => startCheckout(plan)}
                    disabled={checkingOut}
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('premium.plan.processing')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('premium.plan.cta')}
                      </>
                    )}
                  </Button>
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t('premium.plan.signInRequired')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <LegalFooter />
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
};

export default Premium;

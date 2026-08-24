import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, MessageCircle, Shield, Star, Users2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { LegalFooter } from '@/components/navigation/LegalFooter';
import { DailySpark } from '@/components/home/DailySpark';
import { HeroDeck } from '@/components/home/HeroDeck';
import { Reveal } from '@/components/home/Reveal';
import { AiTease, HeatLevels, HowItWorks, PricingStrip, StickyCta } from '@/components/home/LandingSections';
import { track } from '@/lib/analytics';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleAuthModalEvent = () => setShowAuthModal(true);
    window.addEventListener('home-auth-modal', handleAuthModalEvent);
    return () => window.removeEventListener('home-auth-modal', handleAuthModalEvent);
  }, []);

  // Sticky mobile CTA appears once the hero has scrolled out of view
  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const handleStartJourney = (section: string) => {
    track('landing_cta_clicked', { section });
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/create-room');
    }
  };

  return (
    <div className="landing-dark relative min-h-screen overflow-hidden">
      {/* ------------------------------------------------ HERO ------ */}
      <section ref={heroRef} className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Copy + CTAs */}
          <div className="text-center lg:text-left">
            <div className="mb-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span className="landing-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                <Shield className="h-3.5 w-3.5 text-[#ff8fb0]" aria-hidden="true" />
                {t('landing.badge')}
              </span>
            </div>

            <img
              src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png"
              alt="Let's Get Close"
              className="mx-auto mb-7 h-16 w-auto md:h-20 lg:mx-0"
            />

            <h1 className="font-display text-balance text-4xl font-semibold leading-[1.08] text-white md:text-5xl lg:text-[3.4rem]">
              {t('landing.headline')}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-white/65 md:text-lg lg:mx-0">
              {t('landing.sub')}
            </p>

            <div className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row lg:mx-0">
              <button
                onClick={() => handleStartJourney('hero')}
                className="landing-cta group inline-flex min-h-14 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-8 text-lg font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8fb0]"
              >
                <Heart className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden="true" />
                {t('landing.ctaPlay')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <button
                onClick={() => {
                  track('landing_cta_clicked', { section: 'hero_join' });
                  navigate('/join-room');
                }}
                className="inline-flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/25 px-8 text-lg font-semibold text-white/90 transition-colors hover:border-[#ff5c93]/60 hover:bg-[#ff5c93]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8fb0]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {t('landing.ctaJoin')}
              </button>
            </div>

            {/* Social proof strip */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-white/55 lg:justify-start">
              <span className="inline-flex items-center gap-2">
                <Users2 className="h-4 w-4 text-[#ff8fb0]" aria-hidden="true" />
                {t('landing.stats.couples')}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#ff8fb0]" aria-hidden="true" />
                {t('landing.stats.questions')}
              </span>
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-[#ffb84d] text-[#ffb84d]" aria-hidden="true" />
                {t('landing.stats.rating')}
              </span>
            </div>
          </div>

          {/* Interactive deck */}
          <div className="pt-2 lg:pt-6">
            <HeroDeck />
          </div>
        </div>
      </section>

      {/* --------------------------------------------- SECTIONS ---- */}
      <HowItWorks />
      <HeatLevels />
      <AiTease />

      {/* Daily Spark ritual */}
      <section className="mx-auto max-w-2xl px-4 py-20 md:py-24">
        <Reveal>
          <div className="mb-8 text-center">
            <h2 className="font-display text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
              {t('landing.spark.title')}
            </h2>
            <p className="mt-3 text-balance text-white/65">{t('landing.spark.sub')}</p>
          </div>
          <DailySpark />
        </Reveal>
      </section>

      <PricingStrip />

      <div className="border-t border-white/10 px-4">
        <LegalFooter className="text-white/45" />
      </div>

      {/* Sticky mobile CTA */}
      <StickyCta visible={showSticky} onPlay={() => handleStartJourney('sticky_bar')} />

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={() => navigate('/create-room')} />
    </div>
  );
};

export default Home;

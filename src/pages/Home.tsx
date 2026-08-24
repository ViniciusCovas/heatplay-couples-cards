import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Heart, MessageCircle, Shield, Star, Users2 } from 'lucide-react';
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
    <div className="landing-light relative min-h-screen overflow-x-hidden">
      {/* ------------------------------------------------ HERO ------ */}
      {/* The hero owns the fold on desktop: it fills the viewport below the
          header and centres its two columns, so 900px-tall screens no longer
          show a band of dead space under the CTA column. */}
      <section
        ref={heroRef}
        className="relative mx-auto flex max-w-6xl flex-col justify-center px-5 pb-20 pt-10 md:pt-16 lg:min-h-[calc(100svh-4.0625rem)] lg:pb-24"
      >
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Copy + CTAs */}
          <div className="text-center lg:text-left">
            <div className="mb-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span className="landing-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#55505f]">
                <Shield className="h-3.5 w-3.5 text-[#c2185b]" aria-hidden="true" />
                {t('landing.badge')}
              </span>
            </div>

            <img
              src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png"
              alt="Let's Get Close"
              className="mx-auto mb-7 h-16 w-auto md:h-20 lg:mx-0"
            />

            <h1 className="font-display text-balance text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.015em] text-[#23212b] md:text-5xl lg:text-[3.5rem]">
              {t('landing.headline')}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[1.0625rem] leading-[1.65] text-[#55505f] md:text-lg lg:mx-0">
              {t('landing.sub')}
            </p>

            <div className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row lg:mx-0">
              <button
                onClick={() => handleStartJourney('hero')}
                className="landing-cta group inline-flex min-h-14 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-8 text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2185b]"
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
                className="landing-ghost inline-flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-full px-8 text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2185b]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {t('landing.ctaJoin')}
              </button>
            </div>

            {/* Social proof strip */}
            {/* Two aligned columns on desktop so the third item reads as a
                deliberate second row rather than an orphaned wrap. */}
            <div className="mx-auto mt-10 flex max-w-md flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-[#55505f] lg:mx-0 lg:grid lg:max-w-lg lg:grid-cols-2 lg:justify-items-start lg:gap-x-4">
              <span className="inline-flex items-center gap-2">
                <Users2 className="h-4 w-4 text-[#c2185b]" aria-hidden="true" />
                {t('landing.stats.couples')}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#c2185b]" aria-hidden="true" />
                {t('landing.stats.questions')}
              </span>
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-[#f59e0b] text-[#b45309]" aria-hidden="true" />
                {t('landing.stats.rating')}
              </span>
            </div>
          </div>

          {/* Interactive deck */}
          <div className="pt-2 lg:pt-6">
            <HeroDeck />
          </div>
        </div>

        {/* Makes the fold deliberate instead of accidental */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-7 hidden justify-center lg:flex"
        >
          <span className="landing-chip flex h-9 w-9 items-center justify-center rounded-full text-[#c2185b]">
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </span>
        </span>
      </section>

      {/* --------------------------------------------- SECTIONS ---- */}
      <HowItWorks />
      <HeatLevels />
      <AiTease />

      {/* Daily Spark ritual */}
      <section className="mx-auto max-w-2xl px-5 py-20 md:py-28">
        <Reveal>
          <div className="mb-9 text-center">
            <h2 className="font-display text-balance text-[2rem] font-semibold leading-[1.15] tracking-[-0.01em] text-[#23212b] md:text-4xl">
              {t('landing.spark.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-balance leading-relaxed text-[#55505f]">
              {t('landing.spark.sub')}
            </p>
          </div>
          <DailySpark />
        </Reveal>
      </section>

      <PricingStrip />

      <div className="border-t border-[#f0dbe3] bg-white/45 px-5">
        <LegalFooter className="text-[#6c6577]" />
      </div>

      {/* Sticky mobile CTA */}
      <StickyCta visible={showSticky} onPlay={() => handleStartJourney('sticky_bar')} />

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={() => navigate('/create-room')} />
    </div>
  );
};

export default Home;

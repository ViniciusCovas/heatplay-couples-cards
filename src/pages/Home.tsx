import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MoveUpRight, Heart } from 'lucide-react';
import { LegalFooter } from '@/components/navigation/LegalFooter';
import { HeroDeck } from '@/components/home/HeroDeck';
import { AiTease, HeatLevels, HowItWorks, PricingStrip, StickyCta, FAQ } from '@/components/home/LandingSections';
import { getLandingCopy } from '@/components/home/landing-copy';
import { track } from '@/lib/analytics';
import '@/components/home/landing-home.css';

export default function Home() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = getLandingCopy(i18n.language).hero;
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const play = (section: string) => {
    track('landing_cta_clicked', { section });
    navigate('/play');
  };
  const tryCard = () => {
    track('landing_demo_opened');
    demoRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    demoRef.current?.focus({ preventScroll: true });
  };

  return <main id="main-content" className="landing-light landing-v2">
    <section ref={heroRef} className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-hero-orbit" aria-hidden="true" />
      <div className="landing-hero-copy">
        <p className="landing-eyebrow"><span className="landing-pair-mark" aria-hidden="true"><Heart size={14} fill="currentColor" /><Heart size={14} /></span>{copy.eyebrow}</p>
        <h1 id="hero-title">{copy.title}<br /><span>{copy.accent}</span></h1>
        <p className="landing-hero-description">{copy.description}</p>
        <div className="landing-hero-actions">
          <button className="landing-main-action" onClick={() => play('hero')}>{copy.play}<ArrowRight size={19} aria-hidden="true" /></button>
          <button className="landing-demo-action" onClick={tryCard}>{copy.tryCard}<MoveUpRight size={17} aria-hidden="true" /></button>
        </div>
        <p className="landing-hero-note">{copy.note}</p>
      </div>
      <div ref={demoRef} className="landing-hero-demo" id="try-a-card" tabIndex={-1} aria-label={copy.tryCard}>
        <HeroDeck />
      </div>
    </section>
    <HowItWorks />
    <HeatLevels />
    <AiTease />
    <PricingStrip />
    <FAQ />
    <div className="landing-footer"><img src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png" alt="Let's Get Close" width="96" height="48" loading="lazy" /><LegalFooter /></div>
    <StickyCta visible={showSticky} onPlay={() => play('sticky_bar')} />
  </main>;
}

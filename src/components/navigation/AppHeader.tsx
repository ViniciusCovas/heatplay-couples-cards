import React, { lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { LanguageSelector } from '@/components/ui/language-selector';
import { track } from '@/lib/analytics';

// The public header never loads the account client in isolated preview builds.
const AccountHeader = lazy(() => import('./AccountHeader'));
const copy = {
  es: { how: 'Cómo se juega', levels: 'Los niveles', faq: 'Dudas', play: 'Ver demo', nav: 'Navegación principal', home: 'Página principal' },
  en: { how: 'How to play', levels: 'The levels', faq: 'FAQs', play: 'Try demo', nav: 'Main navigation', home: 'Home' },
  pt: { how: 'Como jogar', levels: 'Os níveis', faq: 'Dúvidas', play: 'Ver demo', nav: 'Navegação principal', home: 'Página inicial' },
  fr: { how: 'Comment jouer', levels: 'Les niveaux', faq: 'Questions', play: 'Démo', nav: 'Navigation principale', home: 'Accueil' },
};

export const AppHeader = ({ onAuthClick }: { onAuthClick?: () => void }) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const language = i18n.language.split('-')[0] as keyof typeof copy;
  const labels = copy[language] ?? copy.en;
  const isLanding = location.pathname === '/';
  const isolatedPreview = import.meta.env.VITE_TABLE_PREVIEW === 'true';

  if (!isLanding && !isolatedPreview) {
    return <Suspense fallback={null}><AccountHeader onAuthClick={onAuthClick} /></Suspense>;
  }

  return (
    <header className="relative z-40 border-b border-[#efdce5]/70 bg-[#fff8fa]">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Link to="/" aria-label={`Let's Get Close · ${labels.home}`} className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2185b]">
          <img src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png" alt="Let's Get Close" width="112" height="48" className="h-10 w-auto sm:h-11" />
        </Link>
        <nav aria-label={labels.nav} className="hidden items-center gap-7 text-[13px] font-semibold text-[#55485c] lg:flex">
          <a href="/#how-it-works" className="rounded hover:text-[#c2185b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{labels.how}</a>
          <a href="/#levels" className="rounded hover:text-[#c2185b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{labels.levels}</a>
          <a href="/#faq" className="rounded hover:text-[#c2185b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{labels.faq}</a>
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3 text-[#342439]">
          <LanguageSelector />
          <Link to="/play" onClick={() => track('landing_cta_clicked', { section: 'header' })} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#c2185b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a71550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2185b] sm:px-6">
            {labels.play}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
};

import { ArrowRight, Check, ChevronDown, Heart, Sparkles, Flame, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reveal } from '@/components/home/Reveal';
import { getLandingCopy } from '@/components/home/landing-copy';
import { getLevelDeck, type CardLevel } from '@/lib/levelDeck';
import { track } from '@/lib/analytics';
import './landing-sections.css';

const levelNumbers: CardLevel[] = [1, 2, 3, 4];
const levelIcons = [Sparkles, Heart, Flame, Zap];

function PlayLink({ section, children, className = '' }: { section: string; children: React.ReactNode; className?: string }) {
  return <Link className={`lgc-section-cta ${className}`} to="/play" onClick={() => track('landing_cta_clicked', { section })}>{children}<ArrowRight size={18} aria-hidden="true" /></Link>;
}

export function HowItWorks() {
  const { i18n, t } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  return <section className="lgc-how lgc-section" id="how-it-works">
    <div className="lgc-section-inner">
      <Reveal><p className="lgc-eyebrow">{copy.how.eyebrow}</p><h2 className="lgc-section-title">{copy.how.title}</h2></Reveal>
      <div className="lgc-steps">
        {copy.how.steps.map((step, index) => <Reveal key={step.title} delay={index * 70}>
          <div className="lgc-step-illustration" aria-hidden="true">
            {index === 0 ? <div className="lgc-mini-levels">{levelNumbers.map(level => { const Icon = levelIcons[level - 1]; return <span key={level} data-level={level}><Icon size={19} /><small>{t(`levels.level${level}Name`)}</small></span>; })}</div>
              : index === 1 ? <div className="lgc-mini-turn"><span>1</span><div><ArrowRight size={25} /><small>{copy.how.micro[1]}</small></div><span>2</span></div>
              : <div className="lgc-mini-feelings"><small>{copy.how.micro[2]}</small><div><span>🫶</span><span>🤩</span><span>🔥</span></div></div>}
          </div>
          <div className="lgc-step-title"><span>0{index + 1}</span><h3>{step.title}</h3></div>
          <p className="lgc-section-body">{step.body}</p>
        </Reveal>)}
      </div>
    </div>
  </section>;
}

export function HeatLevels() {
  const { i18n, t } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  return <section className="lgc-section lgc-level-section" id="levels">
    <div className="lgc-section-inner">
      <Reveal><p className="lgc-eyebrow">{copy.levels.eyebrow}</p><h2 className="lgc-section-title">{copy.levels.title}</h2><p className="lgc-section-sub">{copy.levels.sub}</p></Reveal>
      <div className="lgc-level-list">
        {levelNumbers.map((level, index) => { const Icon = levelIcons[index]; return <Reveal key={level} delay={index * 60}>
          <article className="lgc-level-tile" data-level={level}>
            <div className="lgc-level-label"><Icon size={23} aria-hidden="true" /><span>0{level}</span></div>
            <h3>{t(`levels.level${level}Name`)}</h3><p>{copy.levels.descriptions[index]}</p>
            <div className="lgc-level-question"><small>{copy.levels.sample}</small><p>“{t(`variations.levels.${level}.questions.0`)}”</p></div>
          </article>
        </Reveal>; })}
      </div>
      <div className="lgc-center"><PlayLink section="levels">{copy.levels.action}</PlayLink></div>
    </div>
  </section>;
}

/** The current game dynamics, rather than a claim of live AI personalization. */
export function AiTease() {
  const { i18n, t } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  const choices = Object.entries(getLevelDeck(2).guess);
  return <>
    <section className="lgc-section lgc-dynamics">
      <div className="lgc-section-inner lgc-dynamics-layout">
        <Reveal className="lgc-dynamics-copy"><p className="lgc-eyebrow">{copy.dynamics.eyebrow}</p><h2 className="lgc-section-title">{copy.dynamics.title}</h2><p className="lgc-section-sub">{copy.dynamics.sub}</p>
          <dl className="lgc-dynamic-list">
            {[['👀', copy.dynamics.guess, copy.dynamics.guessBody], ['✨', copy.dynamics.match, copy.dynamics.matchBody], ['💬', copy.dynamics.deepen, copy.dynamics.deepenBody]].map(([emoji, title, body]) => <div key={title}><span aria-hidden="true">{emoji}</span><div><dt>{title}</dt><dd>{body}</dd></div></div>)}
          </dl>
          <p className="lgc-dynamic-note">{copy.dynamics.note}</p>
        </Reveal>
        <Reveal className="lgc-dynamics-art" delay={100}>
          <div className="lgc-guess-example">
            <div className="lgc-guess-heading"><img src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png" alt="Let's Get Close" /><span>{t('levels.level2Name')}</span></div>
            <p className="lgc-guess-kicker">{copy.dynamics.guess}</p>
            <p className="lgc-guess-question">{t('variations.levels.2.guessTitle')}</p>
            <div className="lgc-guess-choices">{choices.map(([key, emoji]) => <span key={key}><span aria-hidden="true">{emoji}</span>{t(`variations.levels.2.guessOptions.${key}`)}</span>)}</div>
            <div className="lgc-guess-bottom"><span aria-hidden="true">💭</span>{copy.dynamics.reveal}</div>
          </div>
        </Reveal>
      </div>
    </section>
    <section className="lgc-section lgc-ritual"><Reveal className="lgc-section-inner lgc-ritual-inner"><div className="lgc-ritual-symbol" aria-hidden="true">✳</div><div><p className="lgc-eyebrow">{copy.ritual.eyebrow}</p><h2 className="lgc-section-title">{copy.ritual.title}</h2><p className="lgc-section-sub">{copy.ritual.body}</p></div></Reveal></section>
  </>;
}

export function PricingStrip() {
  const { i18n } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  return <section className="lgc-section lgc-plans" id="plans"><div className="lgc-section-inner">
    <Reveal><p className="lgc-eyebrow">{copy.plans.eyebrow}</p><h2 className="lgc-section-title">{copy.plans.title}</h2></Reveal>
    <div className="lgc-plan-grid">
      <Reveal className="lgc-plan-current"><span className="lgc-plan-tag">{copy.plans.freeTag}</span><h3>{copy.plans.free}</h3><p>{copy.plans.freeBody}</p><ul>{copy.plans.freeFeatures.map(feature => <li key={feature}><Check size={17} aria-hidden="true" />{feature}</li>)}</ul><PlayLink section="plans">{copy.hero.play}</PlayLink></Reveal>
      <Reveal className="lgc-plan-future" delay={80}><span className="lgc-plan-tag">{copy.plans.upcomingTag}</span><h3>{copy.plans.upcoming}</h3><p>{copy.plans.upcomingBody}</p><ul>{copy.plans.upcomingFeatures.map(feature => <li key={feature}><Sparkles size={16} aria-hidden="true" />{feature}</li>)}</ul><small>{copy.plans.note}</small></Reveal>
    </div>
  </div></section>;
}

export function FAQ() {
  const { i18n } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  return <><section className="lgc-section lgc-faq" id="faq"><div className="lgc-section-inner"><Reveal><h2 className="lgc-section-title">{copy.faq.title}</h2></Reveal><div className="lgc-faq-items">{copy.faq.items.map((item, index) => <details key={item.q} onToggle={event => { if (event.currentTarget.open) track('landing_faq_opened', { item: index }); }}><summary>{item.q}<ChevronDown size={19} aria-hidden="true" /></summary><p>{item.a}</p></details>)}</div></div></section>
    <section className="lgc-section lgc-closing"><Reveal className="lgc-section-inner"><Heart size={35} strokeWidth={1.5} aria-hidden="true" /><h2 className="lgc-section-title">{copy.closing.title}</h2><p className="lgc-section-sub">{copy.closing.sub}</p><PlayLink section="closing">{copy.hero.play}</PlayLink><small>{copy.hero.note}</small></Reveal></section>
  </>;
}

export function StickyCta({ visible, onPlay }: { visible: boolean; onPlay: () => void }) {
  const { i18n } = useTranslation();
  const copy = getLandingCopy(i18n.language);
  return <div className={`lgc-sticky-play ${visible ? 'is-visible' : ''}`} aria-hidden={!visible} {...{ inert: !visible ? '' : undefined }}><button type="button" onClick={onPlay}>{copy.hero.play}<ArrowRight size={18} aria-hidden="true" /></button></div>;
}

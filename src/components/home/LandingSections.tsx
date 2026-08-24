import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Flame, Link2, MessageCircle, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';
import { HEAT_STYLE } from '@/components/home/HeroDeck';
import { getSparkSample } from '@/lib/dailySpark';
import { paintShareCard } from '@/components/insights/ShareableCard';
import { track } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/* Section shell                                                       */
/* ------------------------------------------------------------------ */

const SectionHeading = ({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) => (
  <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
    {eyebrow && (
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#c2185b]">{eyebrow}</p>
    )}
    <h2 className="font-display text-balance text-[2rem] font-semibold leading-[1.15] tracking-[-0.01em] text-[#23212b] md:text-[2.6rem]">
      {title}
    </h2>
    {sub && (
      <p className="mt-4 text-balance text-base leading-[1.65] text-[#55505f] md:text-lg">{sub}</p>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* How it works — 3 steps with HTML/CSS mini-mockups                   */
/* ------------------------------------------------------------------ */

const RoomCodeMini = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center gap-2.5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c6577]">{label}</span>
    <div className="flex gap-1.5" aria-hidden="true">
      {['L', 'G', 'C', '6', '9'].map((ch, i) => (
        <span
          key={i}
          className="flex h-11 w-9 items-center justify-center rounded-xl border border-[#f4c3d5] bg-white font-mono text-lg font-bold text-[#c2185b] shadow-[0_4px_10px_-6px_rgba(194,24,91,0.45)]"
        >
          {ch}
        </span>
      ))}
    </div>
  </div>
);

const ChatMini = ({ bubble, reply }: { bubble: string; reply: string }) => (
  <div className="flex w-full max-w-[240px] flex-col gap-2" aria-hidden="true">
    <div className="self-start rounded-2xl rounded-bl-sm border border-[#ece7ef] bg-white px-3.5 py-2 text-[13px] leading-snug text-[#3b3745] shadow-[0_4px_12px_-8px_rgba(120,40,70,0.35)]">
      {bubble}
      <span className="mt-1 flex items-center gap-1 text-[10px] text-[#6c6577]">
        <Link2 className="h-2.5 w-2.5" /> letsgetclose.app/join
      </span>
    </div>
    <div className="self-end rounded-2xl rounded-br-sm bg-[#e91e63] px-3.5 py-2 text-[13px] leading-snug text-white shadow-[0_6px_14px_-8px_rgba(233,30,99,0.7)]">
      {reply}
    </div>
  </div>
);

const ScoreRingMini = ({ label }: { label: string }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="#f6e2ea" strokeWidth="7" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke="url(#lgc-ring)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${c * 0.87} ${c}`}
          />
          <defs>
            <linearGradient id="lgc-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff7043" />
              <stop offset="55%" stopColor="#e91e63" />
              <stop offset="100%" stopColor="#c2185b" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-[#23212b]">
          87<span className="text-[11px] font-semibold text-[#6c6577]">%</span>
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c6577]">{label}</span>
    </div>
  );
};

export const HowItWorks = () => {
  const { t } = useTranslation();
  const steps = [
    {
      title: t('landing.how.step1.title'),
      desc: t('landing.how.step1.desc'),
      mini: <RoomCodeMini label={t('landing.how.step1.chip')} />,
    },
    {
      title: t('landing.how.step2.title'),
      desc: t('landing.how.step2.desc'),
      mini: <ChatMini bubble={t('landing.how.step2.bubble')} reply={t('landing.how.step2.reply')} />,
    },
    {
      title: t('landing.how.step3.title'),
      desc: t('landing.how.step3.desc'),
      mini: <ScoreRingMini label={t('landing.how.step3.score')} />,
    },
  ];
  return (
    <section className="landing-band px-5 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
      <Reveal>
        <SectionHeading title={t('landing.how.title')} />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-3 md:gap-6">
        {steps.map((step, i) => (
          <Reveal key={i} delay={i * 120} className="h-full">
            <div className="landing-panel landing-panel-hover flex h-full flex-col items-center gap-6 rounded-3xl p-7 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdeaf1] font-display text-sm font-semibold italic text-[#c2185b]">
                {i + 1}
              </span>
              <div className="flex min-h-[7rem] items-center justify-center">{step.mini}</div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#23212b]">{step.title}</h3>
                <p className="text-sm leading-[1.6] text-[#55505f]">{step.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Heat levels — real names + real sample questions                    */
/* ------------------------------------------------------------------ */

const LEVEL_SAMPLE_INDICES = [5, 25, 44, 59];

export const HeatLevels = () => {
  const { t, i18n } = useTranslation();
  const samples = getSparkSample(i18n.language, LEVEL_SAMPLE_INDICES);
  const levels = ([1, 2, 3, 4] as const).map((n, i) => ({
    n,
    name: t(`levels.level${n}Name`),
    desc: t(`landing.levels.l${n}desc`),
    sample: samples[i],
    style: HEAT_STYLE[n],
  }));

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <Reveal>
        <SectionHeading title={t('landing.levels.title')} sub={t('landing.levels.sub')} />
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {levels.map((level, i) => (
          <Reveal key={level.n} delay={i * 100} className="h-full">
            <div
              className="landing-panel landing-panel-hover relative flex h-full flex-col overflow-hidden rounded-3xl p-6 pt-7"
              style={{ background: level.style.tint, borderColor: level.style.line }}
            >
              {/* temperature bar — blush → rose → coral → deep red */}
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
                style={{ background: `linear-gradient(90deg, ${level.style.dot}, ${level.style.dot}33)` }}
                aria-hidden="true"
              />
              <div className="mb-4 flex items-center justify-between">
                <span className="flex gap-0.5" aria-label={`${level.n}/4`}>
                  {[1, 2, 3, 4].map((f) => (
                    <Flame
                      key={f}
                      className="h-4 w-4"
                      style={{
                        color: f <= level.n ? level.style.dot : '#e6d5dd',
                        fill: f <= level.n ? level.style.dot : 'none',
                      }}
                    />
                  ))}
                </span>
                <span className="font-display text-sm font-semibold italic text-[#6c6577]">0{level.n}</span>
              </div>
              <h3 className="text-xl font-semibold" style={{ color: level.style.ink }}>
                {level.name}
              </h3>
              <p className="mb-5 mt-2 text-sm leading-[1.6] text-[#55505f]">{level.desc}</p>
              <div
                className="mt-auto rounded-2xl bg-white p-4"
                style={{ border: `1px solid ${level.style.line}` }}
              >
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c6577]">
                  {t('landing.levels.sample')}
                </p>
                <p className="font-display text-[15px] italic leading-snug text-[#23212b]">“{level.sample}”</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* AI analysis tease — real share-card painter with demo data          */
/* ------------------------------------------------------------------ */

export const AiTease = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cardUrl, setCardUrl] = useState('');

  useEffect(() => {
    const canvas = document.createElement('canvas');
    paintShareCard(canvas, 87, {
      brand: "Let's Get Close",
      archetype: t('shareCard.archetypes.magnetic'),
      compatibility: t('shareCard.compatibility'),
      ourVibe: t('shareCard.ourVibe'),
      insightLabel: t('shareCard.insightLabel'),
      insight: t('landing.ai.insight'),
      footer: t('shareCard.footer'),
    });
    setCardUrl(canvas.toDataURL('image/png'));
  }, [t]);

  return (
    <section className="landing-band px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2 md:gap-16">
        <Reveal className="order-2 md:order-1">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#c2185b]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('landing.ai.eyebrow')}
          </p>
          <h2 className="font-display text-balance text-[2rem] font-semibold leading-[1.15] tracking-[-0.01em] text-[#23212b] md:text-[2.6rem]">
            {t('landing.ai.title')}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-[1.65] text-[#55505f] md:text-lg">{t('landing.ai.body')}</p>
          <button
            onClick={() => {
              track('landing_cta_clicked', { section: 'ai_tease' });
              navigate('/premium');
            }}
            className="landing-cta mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-7 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2185b]"
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
            {t('landing.ai.cta')}
          </button>
        </Reveal>
        <Reveal className="order-1 md:order-2" delay={120}>
          <div className="relative mx-auto w-full max-w-[268px]">
            <div
              className="absolute -inset-10 rounded-full opacity-80 blur-3xl"
              style={{ background: 'radial-gradient(closest-side, rgba(255,164,197,0.65), transparent)' }}
              aria-hidden="true"
            />
            {cardUrl && (
              <img
                src={cardUrl}
                alt={t('shareCard.previewAlt')}
                className="relative w-full rotate-2 rounded-[1.75rem] ring-1 ring-[#f0c7d5] transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none"
                style={{ boxShadow: '0 30px 60px -24px rgba(160,60,105,0.45), 0 4px 10px -6px rgba(160,60,105,0.3)' }}
              />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Pricing teaser strip                                                */
/* ------------------------------------------------------------------ */

export const PricingStrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-4xl px-5 pb-20 md:pb-28">
      <Reveal>
        <div className="landing-panel flex flex-col gap-7 rounded-3xl p-7 md:flex-row md:items-center md:justify-between md:gap-10 md:p-9">
          <div className="grid flex-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 font-semibold text-[#23212b]">
                <Check className="h-4 w-4 text-[#c2185b]" aria-hidden="true" />
                {t('landing.pricing.free')}
              </p>
              <p className="mt-1.5 text-sm leading-[1.6] text-[#55505f]">{t('landing.pricing.freeDesc')}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold text-[#a15c00]">
                <Crown className="h-4 w-4" aria-hidden="true" />
                {t('landing.pricing.premium')}
              </p>
              <p className="mt-1.5 text-sm leading-[1.6] text-[#55505f]">{t('landing.pricing.premiumDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              track('landing_cta_clicked', { section: 'pricing_strip' });
              navigate('/premium');
            }}
            className="landing-ghost inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-7 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2185b]"
          >
            {t('landing.pricing.cta')}
          </button>
        </div>
      </Reveal>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Sticky mobile CTA                                                   */
/* ------------------------------------------------------------------ */

export const StickyCta = ({ visible, onPlay }: { visible: boolean; onPlay: () => void }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300 md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,245,247,0), rgba(255,245,247,0.96) 45%)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <button
        onClick={onPlay}
        className="landing-cta flex min-h-14 w-full items-center justify-center gap-2 rounded-full text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2185b]"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {t('landing.sticky')}
      </button>
    </div>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Heart } from 'lucide-react';
import { getSparkSample } from '@/lib/dailySpark';

type Heat = 1 | 2 | 3 | 4;

/** Curated sweet→spicy sample: indices into the real Daily Spark question lists. */
const DECK_PICKS: Array<{ index: number; heat: Heat }> = [
  { index: 0, heat: 1 },
  { index: 7, heat: 1 },
  { index: 22, heat: 2 },
  { index: 28, heat: 2 },
  { index: 40, heat: 3 },
  { index: 47, heat: 3 },
  { index: 58, heat: 4 },
  { index: 59, heat: 4 },
];

/**
 * Light heat palette — a temperature progression readable on white/blush.
 * `dot` = decorative flame fill, `ink` = AA-safe text colour on the tint,
 * `tint` = card wash, `line` = hairline border, `glow` = card-top accent.
 */
export const HEAT_STYLE: Record<
  Heat,
  { dot: string; ink: string; tint: string; line: string; glow: string; levelKey: string }
> = {
  1: {
    dot: '#f472a0',
    ink: '#b4326a',
    tint: 'linear-gradient(180deg, #fff3f7 0%, #ffffff 62%)',
    line: '#f7cfdf',
    glow: 'rgba(244,114,160,0.22)',
    levelKey: 'levels.level1Name',
  },
  2: {
    dot: '#e91e63',
    ink: '#c2185b',
    tint: 'linear-gradient(180deg, #ffeef4 0%, #ffffff 62%)',
    line: '#f6c2d6',
    glow: 'rgba(233,30,99,0.22)',
    levelKey: 'levels.level2Name',
  },
  3: {
    dot: '#ff5722',
    ink: '#c33c0c',
    tint: 'linear-gradient(180deg, #fff1ea 0%, #ffffff 62%)',
    line: '#fbcdb8',
    glow: 'rgba(255,87,34,0.22)',
    levelKey: 'levels.level3Name',
  },
  4: {
    dot: '#d81b3c',
    ink: '#b0182f',
    tint: 'linear-gradient(180deg, #ffecee 0%, #ffffff 62%)',
    line: '#f6bcc3',
    glow: 'rgba(216,27,60,0.24)',
    levelKey: 'levels.level4Name',
  },
};

interface DeckCard {
  id: number;
  question: string;
  heat: Heat;
}

const SWIPE_THRESHOLD = 70;
const TAP_THRESHOLD = 8;

/**
 * Interactive fanned deck of real question cards.
 * Tap/click flips the top card; drag (or arrow keys) sends it to the back
 * of the deck and reveals the next question. Pure CSS 3D — no motion libs.
 */
export const HeroDeck = () => {
  const { t, i18n } = useTranslation();

  const cards: DeckCard[] = useMemo(() => {
    const questions = getSparkSample(
      i18n.language,
      DECK_PICKS.map((p) => p.index)
    );
    return DECK_PICKS.map((p, i) => ({ id: i, question: questions[i], heat: p.heat }));
  }, [i18n.language]);

  const [order, setOrder] = useState<number[]>(() => cards.map((c) => c.id));
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [leaving, setLeaving] = useState<0 | -1 | 1>(0);
  const drag = useRef<{ startX: number; active: boolean; moved: boolean }>({
    startX: 0,
    active: false,
    moved: false,
  });
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const advance = (dir: -1 | 1) => {
    if (leaving) return;
    setLeaving(dir);
    leaveTimer.current = setTimeout(() => {
      setOrder((prev) => [...prev.slice(1), prev[0]]);
      setFlipped(false);
      setDragX(0);
      setLeaving(0);
    }, 320);
  };

  React.useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leaving) return;
    drag.current = { startX: e.clientX, active: true, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || leaving) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > TAP_THRESHOLD) drag.current.moved = true;
    setDragX(dx);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      advance(dx > 0 ? 1 : -1);
    } else {
      setDragX(0);
      if (!drag.current.moved) setFlipped((f) => !f);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      advance(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      advance(-1);
    }
  };

  const stack = order.slice(0, 4).map((id) => cards.find((c) => c.id === id)!);

  return (
    <div className="select-none">
      <div className="deck-float">
        <div
          className="perspective-1200 relative mx-auto"
          style={{ width: 'min(300px, 78vw)', height: 'min(420px, 109vw)' }}
        >
          {/* soft shadow cast on the light table */}
          <div
            className="deck-table-shadow pointer-events-none absolute left-1/2 h-10 w-[86%] -translate-x-1/2"
            style={{ bottom: '-2.25rem' }}
            aria-hidden="true"
          />
          {stack
            .map((card, pos) => {
              const isTop = pos === 0;
              const heat = HEAT_STYLE[card.heat];
              // Fanned resting transform for cards behind the top one
              const rest = `translateX(${pos * 9}px) translateY(${pos * -7}px) rotate(${pos * 2.1}deg) scale(${1 - pos * 0.032})`;
              const topTransform = leaving
                ? `translateX(${leaving * 480}px) rotate(${leaving * 24}deg)`
                : `translateX(${dragX}px) rotate(${dragX * 0.06}deg)`;
              return (
                <div
                  key={card.id}
                  className="absolute inset-0"
                  style={{
                    zIndex: 10 - pos,
                    transform: isTop ? topTransform : rest,
                    opacity: leaving && isTop ? 0 : 1,
                    transition:
                      isTop && (leaving || !drag.current.active)
                        ? 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease'
                        : isTop
                          ? 'none'
                          : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
                    touchAction: 'pan-y',
                  }}
                  {...(isTop
                    ? {
                        role: 'button' as const,
                        tabIndex: 0,
                        'aria-label': t('landing.deckHint'),
                        onPointerDown,
                        onPointerMove,
                        onPointerUp,
                        onPointerCancel: onPointerUp,
                        onKeyDown,
                      }
                    : {})}
                >
                  <div
                    className="preserve-3d h-full w-full transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transform: isTop && flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* FRONT — the question, printed on a white/blush card */}
                    <div
                      className={`backface-hidden deck-card absolute inset-0 flex flex-col overflow-hidden p-6 ${isTop ? 'deck-card-top' : ''}`}
                      style={{
                        background: isTop ? heat.tint : '#ffffff',
                        border: `1px solid ${isTop ? heat.line : '#f0e2e8'}`,
                      }}
                    >
                      {/* heat accent bar along the top edge — only the live card */}
                      {isTop && (
                        <span
                          className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
                          style={{ background: `linear-gradient(90deg, ${heat.dot}, ${heat.dot}44)` }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="deck-shine pointer-events-none absolute inset-0" aria-hidden="true" />
                      <div className="relative flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                          style={{ background: `${heat.dot}1f`, color: heat.ink }}
                        >
                          <Flame className="h-3 w-3" aria-hidden="true" />
                          {t(heat.levelKey)}
                        </span>
                        <span className="flex gap-0.5" aria-hidden="true">
                          {[1, 2, 3, 4].map((f) => (
                            <Flame
                              key={f}
                              className="h-3.5 w-3.5"
                              style={{
                                color: f <= card.heat ? heat.dot : '#e6d5dd',
                                fill: f <= card.heat ? heat.dot : 'none',
                              }}
                            />
                          ))}
                        </span>
                      </div>
                      <div className="relative grid flex-1 place-content-center py-4">
                        <p className="font-display text-balance text-[1.35rem] leading-[1.45] text-[#23212b]">
                          “{card.question}”
                        </p>
                      </div>
                      <div className="relative flex items-center justify-between border-t border-[#f3e2e9] pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c6577]">
                        <span>Let's Get Close</span>
                        <Heart className="h-3.5 w-3.5 text-[#e91e63]" fill="#e91e63" aria-hidden="true" />
                      </div>
                    </div>

                    {/* BACK — brand monogram on a soft pink patterned ground */}
                    <div
                      className={`backface-hidden deck-card absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden ${isTop ? 'deck-card-top' : ''}`}
                      style={{
                        transform: 'rotateY(180deg)',
                        background:
                          'radial-gradient(240px 240px at 50% 40%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%), linear-gradient(160deg, #ffd9e6 0%, #ffc9dc 45%, #f9c9e8 100%)',
                        border: '1px solid #f3b6ce',
                      }}
                    >
                      {/* repeating monogram/heart lattice */}
                      <span
                        className="pointer-events-none absolute inset-0 opacity-[0.5]"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 50% 50%, rgba(233,30,99,0.28) 1.6px, transparent 1.7px)',
                          backgroundSize: '22px 22px',
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="pointer-events-none absolute inset-4 rounded-[1.15rem] border border-white/70"
                        aria-hidden="true"
                      />
                      <div
                        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white"
                        style={{ boxShadow: '0 10px 26px -10px rgba(194,24,91,0.45)' }}
                      >
                        <Heart className="h-9 w-9 text-[#e91e63]" fill="#e91e63" aria-hidden="true" />
                      </div>
                      <span className="font-display relative text-[2.1rem] italic tracking-[0.08em] text-[#a3164a]">LGC</span>
                      <span className="relative px-8 text-center text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-[#8e123f]">
                        {t('landing.deckBack')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
            .reverse()}
        </div>
      </div>
      <p className="mt-14 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#6c6577]">
        {t('landing.deckHint')}
      </p>
    </div>
  );
};

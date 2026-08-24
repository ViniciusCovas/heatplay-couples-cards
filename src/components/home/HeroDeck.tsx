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

export const HEAT_STYLE: Record<Heat, { color: string; soft: string; levelKey: string }> = {
  1: { color: '#ff9eb8', soft: 'rgba(255,158,184,0.16)', levelKey: 'levels.level1Name' },
  2: { color: '#ff5c93', soft: 'rgba(255,92,147,0.16)', levelKey: 'levels.level2Name' },
  3: { color: '#ff7a45', soft: 'rgba(255,122,69,0.16)', levelKey: 'levels.level3Name' },
  4: { color: '#ff4d4d', soft: 'rgba(255,77,77,0.16)', levelKey: 'levels.level4Name' },
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
          {stack
            .map((card, pos) => {
              const isTop = pos === 0;
              const heat = HEAT_STYLE[card.heat];
              // Fanned resting transform for cards behind the top one
              const rest = `translateX(${pos * 14}px) translateY(${pos * -10}px) rotate(${pos * 3}deg) scale(${1 - pos * 0.045})`;
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
                    {/* FRONT — the question */}
                    <div
                      className="backface-hidden deck-card absolute inset-0 flex flex-col overflow-hidden p-6"
                      style={{
                        background:
                          'radial-gradient(320px 220px at 85% -10%, rgba(233,30,99,0.30), transparent 70%), linear-gradient(165deg, #2c1035 0%, #1c0a24 60%, #130818 100%)',
                        border: `1px solid ${heat.color}55`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                          style={{ background: heat.soft, color: heat.color }}
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
                                color: f <= card.heat ? heat.color : 'rgba(255,255,255,0.18)',
                                fill: f <= card.heat ? heat.color : 'none',
                              }}
                            />
                          ))}
                        </span>
                      </div>
                      <p className="font-display flex-1 content-center text-balance py-4 text-[1.35rem] leading-snug text-white/95">
                        “{card.question}”
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
                        <span>Let's Get Close</span>
                        <Heart className="h-3.5 w-3.5 text-[#ff5c93]" fill="#ff5c93" aria-hidden="true" />
                      </div>
                    </div>

                    {/* BACK — brand monogram */}
                    <div
                      className="backface-hidden deck-card absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden"
                      style={{
                        transform: 'rotateY(180deg)',
                        background:
                          'radial-gradient(260px 260px at 50% 42%, rgba(233,30,99,0.35), transparent 72%), linear-gradient(160deg, #240d2e 0%, #16081d 100%)',
                        border: '1px solid rgba(233,30,99,0.4)',
                      }}
                    >
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full"
                        style={{
                          background: 'rgba(233,30,99,0.14)',
                          boxShadow: '0 0 60px rgba(233,30,99,0.45)',
                        }}
                      >
                        <Heart className="h-9 w-9 text-[#ff5c93]" fill="#ff5c93" aria-hidden="true" />
                      </div>
                      <span className="font-display text-2xl italic text-white/90">LGC</span>
                      <span className="px-8 text-center text-xs uppercase tracking-[0.22em] text-white/45">
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
      <p className="mt-9 text-center text-xs font-medium uppercase tracking-[0.18em] text-white/55">
        {t('landing.deckHint')}
      </p>
    </div>
  );
};

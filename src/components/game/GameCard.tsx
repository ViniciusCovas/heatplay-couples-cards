import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { AIInsightBadge } from "@/components/game/AIInsightBadge";
import { logger } from "@/utils/logger";
import { useEffect, useMemo, useState } from 'react';

interface GameCardProps {
  currentCard: string;
  currentLevel: number;
  showCard: boolean;
  cardIndex: number;
  totalCards: number;
  aiReasoning?: string;
  aiTargetArea?: string;
  selectionMethod?: string;
  isGeneratingCard?: boolean;
  aiFailureReason?: string;
  subTurn?: string;
  questionProgress?: {
    current: number;
    total: number;
    subPhase: string;
  };
}

/**
 * Light "warming intimacy" ramp — brand tokens only, no gray/black surfaces.
 * L1 soft purple (accent) → L2 pink (primary) → L3 coral (secondary) → L4 deep plum.
 */
const LEVEL_THEMES: Record<number, { solid: string; deep: string; tintA: string; tintB: string }> = {
  1: { solid: 'hsl(280 100% 70%)', deep: 'hsl(280 60% 40%)', tintA: 'hsl(280 95% 86%)', tintB: 'hsl(300 100% 96%)' },
  2: { solid: 'hsl(330 81% 60%)', deep: 'hsl(330 72% 40%)', tintA: 'hsl(330 90% 85%)', tintB: 'hsl(340 100% 96%)' },
  3: { solid: 'hsl(14 100% 57%)', deep: 'hsl(14 80% 38%)', tintA: 'hsl(16 100% 84%)', tintB: 'hsl(24 100% 95%)' },
  4: { solid: 'hsl(316 70% 48%)', deep: 'hsl(316 64% 30%)', tintA: 'hsl(316 55% 76%)', tintB: 'hsl(322 70% 93%)' },
};

const CARD_SHADOW =
  '0 2px 4px rgba(120,40,70,.06), 0 24px 44px -18px rgba(196,60,110,.34), inset 0 0 0 1px rgba(255,255,255,.6)';

export const GameCard = ({
  currentCard,
  currentLevel,
  showCard,
  cardIndex,
  totalCards,
  aiReasoning,
  aiTargetArea,
  selectionMethod,
  isGeneratingCard = false,
  aiFailureReason,
  subTurn,
  questionProgress
}: GameCardProps) => {
  const { t } = useTranslation();

  const theme = LEVEL_THEMES[currentLevel] ?? LEVEL_THEMES[2];

  const getLevelName = (level: number) => {
    return t(`levels.level${level}Name`);
  };

  // Re-fire the flip keyframe whenever the question (or level) changes
  const [flipKey, setFlipKey] = useState(0);
  useEffect(() => {
    setFlipKey((k) => k + 1);
  }, [currentCard, currentLevel]);

  // Get a random micro-tip for loading state
  const loadingMicroTip = useMemo(() => {
    const microTips = t('ai.microTips', { returnObjects: true }) as string[];
    if (Array.isArray(microTips) && microTips.length > 0) {
      const randomIndex = Math.floor(Math.random() * microTips.length);
      return microTips[randomIndex];
    }
    return t('ai.analyzing');
  }, [t, isGeneratingCard]);

  // Check if this is an AI-selected card - Enhanced detection
  const isAICard = selectionMethod === 'ai_intelligent' || Boolean(aiReasoning);

  logger.debug('GameCard render', {
    hasCard: Boolean(currentCard),
    isAICard,
    hasReasoning: Boolean(aiReasoning),
    selectionMethod,
    targetArea: aiTargetArea,
    isGeneratingCard,
    loadingMicroTip
  });

  return (
    <div
      className="flex-1 flex items-center justify-center px-4"
      role="region"
      aria-live="polite"
      aria-label={t('game.question')}
    >
      <div className="relative perspective-1200">
        <Card
          key={flipKey}
          style={{
            backgroundImage: `linear-gradient(140deg, ${theme.tintA}, ${theme.tintB})`,
            boxShadow: CARD_SHADOW,
          }}
          className={`
            w-[min(340px,90vw)] min-h-[420px] h-auto p-0 transition-all duration-700 transform-gpu
            ${showCard ? 'scale-100 opacity-100' : 'scale-95 opacity-70'}
            border-0 rounded-[32px] relative overflow-hidden
            hover:scale-[1.03] animate-flip-card
          `}
        >
          {/* Inner paper area */}
          <div
            className="absolute inset-4 rounded-[24px]"
            style={{
              backgroundImage:
                'linear-gradient(160deg, #FFFFFF 0%, #FFFDFE 45%, hsl(340 60% 98%) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), inset 0 -14px 28px -22px rgba(150,50,90,.25)',
            }}
          />

          {/* Card content — real flex column, everything in normal flow */}
          <div className="relative z-10 flex flex-col min-h-[420px] p-8 text-center">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AIInsightBadge
                  reasoning={aiReasoning}
                  targetArea={aiTargetArea}
                  className="text-xs px-1.5 py-0.5 shadow-sm scale-75 origin-left"
                  isGenerating={isGeneratingCard}
                  failureReason={aiFailureReason}
                  loadingMicroTip={loadingMicroTip}
                />
              </div>

              <div
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: theme.solid }}
                aria-hidden="true"
              >
                {currentLevel}
              </div>
            </div>

            {/* Question region */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${theme.solid}, ${theme.deep})`,
                }}
                aria-hidden="true"
              >
                <Heart className="w-6 h-6 text-white" />
              </div>

              {isGeneratingCard ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[28ch] px-2">
                    {currentCard ? loadingMicroTip : t('game.loadingQuestions')}
                  </p>
                </div>
              ) : (
                <p
                  className="font-display text-foreground text-balance max-w-[28ch] leading-[1.35]"
                  style={{ fontSize: 'clamp(1.25rem, 5.2vw, 1.6rem)' }}
                >
                  {currentCard}
                </p>
              )}
            </div>

            {/* Footer row — normal flow, cannot collide with the question */}
            <div className="flex items-end justify-between gap-3 pt-2">
              <p className="text-sm font-semibold text-left uppercase tracking-[0.08em]" style={{ color: theme.deep }}>
                {getLevelName(currentLevel)}
              </p>
              {!isGeneratingCard && (
                <span className="text-sm font-mono text-muted-foreground shrink-0">
                  {cardIndex + 1}/{totalCards}
                </span>
              )}
            </div>
          </div>

        </Card>
      </div>
    </div>
  );
};

import { useTranslation } from 'react-i18next';
import { PhysicalCard } from './PhysicalCard';
import { AIInsightBadge } from './AIInsightBadge';

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

export function GameCard({ currentCard, currentLevel, showCard, cardIndex, totalCards,
  aiReasoning, aiTargetArea, selectionMethod, isGeneratingCard = false, aiFailureReason }: GameCardProps) {
  const { t } = useTranslation();
  const hasAI = selectionMethod === 'ai_intelligent' || Boolean(aiReasoning);
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-3" role="region" aria-label={t('game.question')} aria-live="polite" aria-busy={isGeneratingCard}>
      <div className="w-full max-w-[368px] transition-opacity motion-reduce:transition-none" style={{ opacity: showCard ? 1 : .65 }}>
        <PhysicalCard key={`${currentLevel}:${currentCard}`} label={t(`levels.level${currentLevel}Name`)} footer={`${cardIndex + 1} / ${totalCards}`} tone={Math.max(0, currentLevel - 2)}>
          {isGeneratingCard ? <p className="font-sans text-base text-muted-foreground" role="status">{t('game.loadingQuestions')}</p> : <p>{currentCard}</p>}
        </PhysicalCard>
      </div>
      {hasAI && !isGeneratingCard && <AIInsightBadge reasoning={aiReasoning} targetArea={aiTargetArea} failureReason={aiFailureReason} className="text-xs" />}
    </div>
  );
}

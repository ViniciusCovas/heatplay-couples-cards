import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NextStep {
  suggestedLevel?: number;
  title?: string;
  description?: string;
}

interface NextStepCardProps {
  nextStep?: NextStep | null;
}

/**
 * "What to try next" — renders the AI's `next_step` object as the natural
 * closing action of the analysis. Degrades to null when the field is absent
 * (older analyses stored before `next_step` existed).
 */
export const NextStepCard: React.FC<NextStepCardProps> = ({ nextStep }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!nextStep || (!nextStep.title && !nextStep.description)) return null;

  const level = Number(nextStep.suggestedLevel);
  const hasLevel = Number.isFinite(level) && level >= 1 && level <= 4;
  const levelName = hasLevel ? t(`levels.level${level}Name`) : '';

  return (
    <div className="romantic-card overflow-hidden">
      <div className="h-1.5 w-full btn-gradient-primary" />
      <div className="p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full btn-gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
              {t('ai.fullAnalysis.nextStep.eyebrow')}
            </p>
            {nextStep.title && (
              <h3 className="font-display text-2xl sm:text-3xl leading-tight text-foreground break-words">
                {nextStep.title}
              </h3>
            )}
          </div>
        </div>

        {hasLevel && (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <span className="text-xs font-semibold text-primary">
              {t('ai.fullAnalysis.nextStep.levelBadge', { level, name: levelName })}
            </span>
          </div>
        )}

        {nextStep.description && (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {nextStep.description}
          </p>
        )}

        <Button
          onClick={() => navigate('/create-room')}
          className="btn-gradient-primary text-white border-0 shadow-md w-full sm:w-auto"
          size="lg"
        >
          {t('ai.fullAnalysis.nextStep.cta')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

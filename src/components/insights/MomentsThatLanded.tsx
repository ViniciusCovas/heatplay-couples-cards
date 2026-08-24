import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Heart, ShieldCheck, Star } from 'lucide-react';

export interface SpecificMoment {
  questionNumber?: number;
  type?: string;
  score?: number;
  insight?: string;
  significance?: string;
}

interface MomentsThatLandedProps {
  moments?: SpecificMoment[] | null;
}

const TYPE_META: Record<string, { icon: React.ReactNode; tint: string }> = {
  trust_breakthrough: { icon: <ShieldCheck className="w-4 h-4" />, tint: 'text-primary bg-primary/10' },
  intimacy_peak: { icon: <Heart className="w-4 h-4" />, tint: 'text-secondary bg-secondary/10' },
  attraction_spark: { icon: <Flame className="w-4 h-4" />, tint: 'text-primary bg-primary/10' },
};

/**
 * Breakthrough moments the edge function derives from partner ratings >= 4.5.
 * Only the question number, the dimension that spiked and the score are shown —
 * the couple answers out loud, so no answer text is ever surfaced here.
 */
export const MomentsThatLanded: React.FC<MomentsThatLandedProps> = ({ moments }) => {
  const { t } = useTranslation();

  const valid = (moments || []).filter(
    (m) => m && typeof m.questionNumber === 'number' && typeof m.score === 'number' && m.type
  );
  if (valid.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl text-foreground">
          {t('ai.fullAnalysis.moments.title')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t('ai.fullAnalysis.moments.subtitle')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {valid.map((m, i) => {
          const meta = TYPE_META[m.type as string] || {
            icon: <Star className="w-4 h-4" />,
            tint: 'text-primary bg-primary/10',
          };
          const typeKey = `ai.fullAnalysis.moments.types.${m.type}`;
          const typeLabel = t(typeKey);
          const sigKey = `ai.fullAnalysis.moments.significance.${m.significance}`;
          const sigLabel = m.significance ? t(sigKey) : '';

          return (
            <div key={i} className="romantic-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${meta.tint}`}>
                  {meta.icon}
                  <span className="text-xs font-semibold">
                    {typeLabel === typeKey ? t('ai.fullAnalysis.moments.types.default') : typeLabel}
                  </span>
                </span>
                {sigLabel && sigLabel !== sigKey && (
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {sigLabel}
                  </span>
                )}
              </div>

              <p className="font-display text-lg text-foreground">
                {t('ai.fullAnalysis.moments.questionLabel', { number: m.questionNumber })}
              </p>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-primary">{m.score}</span>
                <span className="text-sm text-muted-foreground">
                  {t('ai.fullAnalysis.moments.outOf')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('ai.fullAnalysis.moments.footnote')}
      </p>
    </section>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Compass, MessageCircleHeart, Waves, Link2, Sparkles } from 'lucide-react';

export interface IntelligenceMarkers {
  primaryDynamic?: string;
  communicationDNA?: string;
  volatilityProfile?: string;
  rarityPercentile?: string;
  dataPoints?: number;
  analysisDepth?: string;
}

export interface AdvancedMetrics {
  honestyIntimacyCorrelation?: number;
  attractionSurpriseCorrelation?: number;
  overallVolatility?: number;
  averageResponseTime?: number;
  breakthroughFrequency?: number;
}

interface DynamicsSectionProps {
  markers?: IntelligenceMarkers | null;
  metrics?: AdvancedMetrics | null;
}

/** Server enums arrive in English; map to a localized label, fall back to raw. */
const useEnumLabel = () => {
  const { t } = useTranslation();
  return (group: string, value?: string) => {
    if (!value) return '';
    const key = `ai.fullAnalysis.dynamics.${group}.${value.replace(/[^A-Za-z]/g, '')}`;
    const translated = t(key);
    return translated === key ? value : translated;
  };
};

interface Tile {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

export const DynamicsSection: React.FC<DynamicsSectionProps> = ({ markers, metrics }) => {
  const { t } = useTranslation();
  const enumLabel = useEnumLabel();

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

  const correlationStrength = (v: number) => {
    const a = Math.abs(v);
    if (a >= 0.6) return t('ai.fullAnalysis.dynamics.link.strong');
    if (a >= 0.3) return t('ai.fullAnalysis.dynamics.link.moderate');
    return t('ai.fullAnalysis.dynamics.link.light');
  };

  const tiles: Tile[] = [];

  if (markers?.primaryDynamic) {
    tiles.push({
      icon: <Compass className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.primaryDynamic.label'),
      value: enumLabel('primaryDynamic', markers.primaryDynamic),
      hint: t('ai.fullAnalysis.dynamics.primaryDynamic.hint'),
    });
  }

  if (markers?.communicationDNA) {
    tiles.push({
      icon: <MessageCircleHeart className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.communication.label'),
      value: enumLabel('communication', markers.communicationDNA),
      hint: t('ai.fullAnalysis.dynamics.communication.hint'),
    });
  }

  const overallVolatility = num(metrics?.overallVolatility);
  if (markers?.volatilityProfile || overallVolatility !== undefined) {
    tiles.push({
      icon: <Waves className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.steadiness.label'),
      value: markers?.volatilityProfile
        ? enumLabel('steadiness', markers.volatilityProfile)
        : t('ai.fullAnalysis.dynamics.steadiness.spread', { value: overallVolatility?.toFixed(2) }),
      hint:
        overallVolatility !== undefined
          ? t('ai.fullAnalysis.dynamics.steadiness.spread', { value: overallVolatility.toFixed(2) })
          : t('ai.fullAnalysis.dynamics.steadiness.hint'),
    });
  }

  const hi = num(metrics?.honestyIntimacyCorrelation);
  if (hi !== undefined) {
    tiles.push({
      icon: <Link2 className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.honestyIntimacy.label'),
      value: correlationStrength(hi),
      hint: t('ai.fullAnalysis.dynamics.honestyIntimacy.hint'),
    });
  }

  const as = num(metrics?.attractionSurpriseCorrelation);
  if (as !== undefined) {
    tiles.push({
      icon: <Sparkles className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.attractionSurprise.label'),
      value: correlationStrength(as),
      hint: t('ai.fullAnalysis.dynamics.attractionSurprise.hint'),
    });
  }

  const dataPoints = num(markers?.dataPoints);
  if (dataPoints !== undefined && dataPoints > 0) {
    tiles.push({
      icon: <Activity className="w-4 h-4" />,
      label: t('ai.fullAnalysis.dynamics.signals.label'),
      value: String(dataPoints),
      hint: t('ai.fullAnalysis.dynamics.signals.hint'),
    });
  }

  if (tiles.length === 0) return null;

  const rarity = markers?.rarityPercentile;

  return (
    <section className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl text-foreground">
          {t('ai.fullAnalysis.dynamics.title')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t('ai.fullAnalysis.dynamics.subtitle')}
        </p>
      </div>

      <div className="romantic-card p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tiles.map((tile, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-primary">
                {tile.icon}
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {tile.label}
                </span>
              </div>
              <p className="font-display text-lg leading-snug text-foreground">{tile.value}</p>
              {tile.hint && <p className="text-xs text-muted-foreground leading-relaxed">{tile.hint}</p>}
            </div>
          ))}
        </div>

        {rarity && (
          <p className="text-center text-sm text-muted-foreground">
            {t('ai.fullAnalysis.dynamics.rarity', { value: rarity })}
          </p>
        )}
      </div>
    </section>
  );
};

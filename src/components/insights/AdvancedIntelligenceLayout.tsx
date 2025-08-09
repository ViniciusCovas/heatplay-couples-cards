import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GameResponse } from '@/utils/connectionAlgorithm';
import { PsychologicalMetrics, IntelligenceInsights } from '@/utils/psychologicalAnalysis';
import { BondMap3D } from './BondMap3D';
import { PsychologicalProgressionTimeline } from './PsychologicalProgressionTimeline';
import { CommunicationDNARadar } from './CommunicationDNARadar';
import { SpecificMomentAnalysis } from './SpecificMomentAnalysis';
import { 
  Brain, 
  Crown, 
  Activity, 
  Target,
  Sparkles
} from 'lucide-react';

interface AdvancedIntelligenceLayoutProps {
  metrics: PsychologicalMetrics;
  insights: IntelligenceInsights;
  responses: GameResponse[];
}

export const AdvancedIntelligenceLayout: React.FC<AdvancedIntelligenceLayoutProps> = ({
  metrics,
  insights,
  responses
}) => {
  const getTrendVolatility = () => {
    return {
      closeness: metrics.progression.trend,
      spark: metrics.progression.trend, 
      anchor: metrics.progression.trend
    } as const;
  };

  const getDataPointCount = () => {
    const evaluatedResponses = responses.filter(r => r.evaluation).length;
    const breakthroughs = metrics.highlights.breakthroughMoments.length;
    const patterns = metrics.highlights.patterns.length;
    return evaluatedResponses * 4 + breakthroughs * 3 + patterns * 2; // Approximate data points
  };

  const getRarityDescription = () => {
    const percentile = insights.rarityMetrics.topPercentile;
    if (percentile >= 90) return "Exceptional relationship intelligence detected";
    if (percentile >= 75) return "Above-average relationship dynamics identified";
    if (percentile >= 50) return "Healthy relationship patterns observed";
    return "Developing relationship foundations with growth potential";
  };

  return (
    <div className="space-y-8">
      {/* Premium Intelligence Header */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  GetClose AI Intelligence 2.0
                </h2>
                <p className="text-muted-foreground">
                  Premium Relationship Analysis • {getDataPointCount()} Data Points Analyzed
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <Badge variant="secondary" className="gap-2 mb-2">
                <Crown className="w-4 h-4" />
                {insights.rarityMetrics.topPercentile}th Percentile
              </Badge>
              <div className="text-sm text-muted-foreground">
                {getRarityDescription()}
              </div>
            </div>
          </div>

          {/* Quick Intelligence Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {((metrics.bondMap.closeness + metrics.bondMap.spark + metrics.bondMap.anchor) / 3 * 20).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Compatibility</div>
              </CardContent>
            </Card>
            
            <Card className="border border-secondary/20 bg-secondary/5">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-secondary">
                  {insights.communicationDNA.style}
                </div>
                <div className="text-sm text-muted-foreground">Communication DNA</div>
              </CardContent>
            </Card>
            
            <Card className="border border-accent/20 bg-accent/5">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-accent capitalize">
                  {metrics.progression.trend}
                </div>
                <div className="text-sm text-muted-foreground">Relationship Trend</div>
              </CardContent>
            </Card>
            
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-green-600">
                  {metrics.highlights.breakthroughMoments.length}
                </div>
                <div className="text-sm text-muted-foreground">Breakthroughs</div>
              </CardContent>
            </Card>
          </div>

          {/* Intelligence Credentials */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Psychological Framework Analysis
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Bond Map Triangulation
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Pattern Recognition
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3D Bond Map Visualization */}
      <BondMap3D 
        bondMap={metrics.bondMap}
        volatility={{
          intimacy: metrics.volatility.intimacy,
          attraction: metrics.volatility.attraction,
          honesty: metrics.volatility.honesty
        }}
        trends={getTrendVolatility()}
      />

      <Separator className="my-8" />

      {/* Psychological Progression Timeline */}
      <PsychologicalProgressionTimeline 
        metrics={metrics}
        responses={responses}
      />

      <Separator className="my-8" />

      {/* Communication DNA Radar */}
      <CommunicationDNARadar 
        metrics={metrics}
        insights={insights}
      />

      <Separator className="my-8" />

      {/* Specific Moment Analysis */}
      <SpecificMomentAnalysis 
        metrics={metrics}
        responses={responses}
      />

      {/* Premium Intelligence Footer */}
      <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-semibold">GetClose AI Intelligence Analysis Complete</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This report represents a comprehensive psychological analysis of your relationship dynamics, 
            utilizing advanced AI algorithms and established relationship psychology frameworks.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>🧠 Advanced Psychology</span>
            <span>📊 Statistical Analysis</span>
            <span>🎯 Personalized Insights</span>
            <span>⚡ Real-time Processing</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
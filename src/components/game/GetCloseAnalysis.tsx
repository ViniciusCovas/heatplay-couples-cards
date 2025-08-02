import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  Users, 
  Lightbulb, 
  Target, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from "@/utils/logger";

interface AnalysisData {
  compatibilityScore: number;
  strengthAreas: Array<{
    area: string;
    score: number;
    insight: string;
  }>;
  growthAreas: Array<{
    area: string;
    score: number;
    recommendation: string;
  }>;
  keyInsights: string[];
  personalizedTips: string[];
  culturalNotes: string;
  relationshipPhase: string;
  nextSessionRecommendation: string;
}

interface GetCloseAnalysisProps {
  roomId: string;
  language?: string;
  isVisible?: boolean;
  onAnalysisComplete?: (analysis: AnalysisData) => void;
}

export const GetCloseAnalysis: React.FC<GetCloseAnalysisProps> = ({ 
  roomId, 
  language = 'en',
  isVisible = true,
  onAnalysisComplete 
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('Generating GetClose AI analysis', { roomId, language });
      
      const { data, error } = await supabase.functions.invoke('getclose-ai-analysis', {
        body: { roomId, language }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate analysis');
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        onAnalysisComplete?.(data.analysis);
        
        toast({
          title: t('ai.analysisComplete'),
          description: t('ai.analysisCompleteDescription'),
        });
      } else {
        throw new Error('Invalid response from AI analysis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error generating AI analysis:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: t('ai.analysisError'),
        description: t('ai.analysisErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'honesty': return <Users className="w-4 h-4" />;
      case 'attraction': return <Heart className="w-4 h-4" />;
      case 'intimacy': return <Sparkles className="w-4 h-4" />;
      case 'surprise': return <Lightbulb className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'exploring': return <Lightbulb className="w-4 h-4" />;
      case 'building': return <TrendingUp className="w-4 h-4" />;
      case 'deepening': return <Heart className="w-4 h-4" />;
      case 'committed': return <Star className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            {t('ai.getcloseAIAnalysis')}
            <Badge variant="secondary" className="ml-2 gap-1">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          </CardTitle>
          
          {analysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!analysis && !isLoading && !error && (
          <div className="text-center py-6 space-y-3">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">
              {t('ai.analysisDescription')}
            </p>
            <Button 
              onClick={generateAnalysis}
              className="gap-2"
            >
              <Brain className="w-4 h-4" />
              {t('ai.generateAnalysis')}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-6 space-y-3">
            <div className="flex justify-center">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('ai.generatingAnalysis')}
            </p>
            <Progress value={65} className="w-full max-w-xs mx-auto" />
          </div>
        )}

        {error && (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAnalysis}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Compatibility Score */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t('ai.compatibilityScore')}</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {analysis.compatibilityScore}%
              </div>
              <Progress 
                value={analysis.compatibilityScore} 
                className="w-full max-w-xs mx-auto h-2" 
              />
            </div>

            <Separator />

            {/* Relationship Phase */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              {getPhaseIcon(analysis.relationshipPhase)}
              <div>
                <span className="text-sm font-medium">{t('ai.relationshipPhase')}: </span>
                <span className="text-sm capitalize">{analysis.relationshipPhase}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                {/* Strength Areas */}
                {analysis.strengthAreas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      {t('ai.strengthAreas')}
                    </h4>
                    <div className="space-y-2">
                      {analysis.strengthAreas.map((strength, index) => (
                        <div key={index} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {getAreaIcon(strength.area)}
                              {t(`game.evaluation.${strength.area}`)}
                            </div>
                            <span className={`text-sm font-bold ${getScoreColor(strength.score)}`}>
                              {strength.score}/10
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700">{strength.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Growth Areas */}
                {analysis.growthAreas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      {t('ai.growthAreas')}
                    </h4>
                    <div className="space-y-2">
                      {analysis.growthAreas.map((growth, index) => (
                        <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {getAreaIcon(growth.area)}
                              {t(`game.evaluation.${growth.area}`)}
                            </div>
                            <span className={`text-sm font-bold ${getScoreColor(growth.score)}`}>
                              {growth.score}/10
                            </span>
                          </div>
                          <p className="text-xs text-orange-700">{growth.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Insights */}
                {analysis.keyInsights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600" />
                      {t('ai.keyInsights')}
                    </h4>
                    <div className="space-y-1">
                      {analysis.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personalized Tips */}
                {analysis.personalizedTips.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      {t('ai.personalizedTips')}
                    </h4>
                    <div className="space-y-1">
                      {analysis.personalizedTips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm p-2 bg-purple-50 rounded border border-purple-200">
                          <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-purple-800">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cultural Notes */}
                {analysis.culturalNotes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">{t('ai.culturalNotes')}</h4>
                    <p className="text-sm text-muted-foreground">{analysis.culturalNotes}</p>
                  </div>
                )}

                {/* Next Session Recommendation */}
                {analysis.nextSessionRecommendation && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      {t('ai.nextSession')}
                    </h4>
                    <p className="text-sm">{analysis.nextSessionRecommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
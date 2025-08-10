import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Crown, 
  Sparkles, 
  TrendingUp, 
  ChevronDown,
  ChevronUp,
  Target,
  Heart,
  Activity,
  Star,
  Mail,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from "@/utils/logger";
import { AIIntelligenceDashboard } from './AIIntelligenceDashboard';
import { AdvancedIntelligenceLayout } from './AdvancedIntelligenceLayout';
import { calculatePsychologicalMetrics, generateIntelligenceInsights } from '@/utils/psychologicalAnalysis';
import { calculateConnectionScore, GameResponse } from '@/utils/connectionAlgorithm';

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
  intelligenceMarkers?: {
    primaryDynamic: string;
    communicationDNA: string;
    volatilityProfile: string;
    rarityPercentile: string;
    dataPoints: number;
    analysisDepth: string;
  };
  specificMoments?: Array<{
    questionNumber: number;
    type: string;
    score: number;
    insight: string;
    significance: string;
  }>;
  responseQuotes?: Array<{
    questionIndex: number;
    questionText: string;
    responsePreview: string;
    overallScore: number;
    breakdown: {
      honesty: number;
      attraction: number;
      intimacy: number;
      surprise: number;
    };
  }>;
  advancedMetrics?: {
    honestyIntimacyCorrelation: number;
    attractionSurpriseCorrelation: number;
    overallVolatility: number;
    averageResponseTime: number;
    breakthroughFrequency: number;
    rarityPercentile: string;
    dataPoints?: number;
    analysisDepth?: string;
  };
}

interface EnhancedGetCloseAnalysisProps {
  roomId: string;
  language?: string;
  isVisible?: boolean;
  onAnalysisComplete?: (analysis: AnalysisData) => void;
}

export const EnhancedGetCloseAnalysis: React.FC<EnhancedGetCloseAnalysisProps> = ({ 
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
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);

  // Load existing analysis on mount
  useEffect(() => {
    loadExistingAnalysis();
  }, [roomId]);

  const loadExistingAnalysis = async () => {
    if (!roomId) return;

    try {
      // Get existing AI analysis
      const { data: existingAnalysis } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('room_id', roomId)
        .eq('analysis_type', 'getclose-ai-analysis')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingAnalysis && existingAnalysis.length > 0) {
        setAnalysis(existingAnalysis[0].ai_response as unknown as AnalysisData);
        onAnalysisComplete?.(existingAnalysis[0].ai_response as unknown as AnalysisData);
      }

      // Load game responses for advanced metrics
      await loadGameResponses();
    } catch (err) {
      logger.error('Error loading existing analysis:', err);
    }
  };

  const loadGameResponses = async () => {
    if (!roomId) return;

    try {
      const { data: responses } = await supabase
        .from('game_responses')
        .select(`
          response,
          response_time,
          evaluation,
          question:questions(text, level_id)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (responses) {
        const gameResponses: GameResponse[] = responses.map(r => ({
          question: (r.question as any)?.text || 'Unknown question',
          response: r.response || '',
          responseTime: r.response_time || 0,
          level: (r.question as any)?.level_id || 1,
          playerId: 'player',
          evaluation: r.evaluation ? (() => {
            try {
              return JSON.parse(r.evaluation);
            } catch {
              return undefined;
            }
          })() : undefined
        }));

        setGameResponses(gameResponses);
      }
    } catch (err) {
      logger.error('Error loading game responses:', err);
    }
  };

  const generateAnalysis = async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      logger.debug('Generating GetClose AI Intelligence analysis', { roomId, language });
      
      const { data, error } = await supabase.functions.invoke('getclose-ai-analysis', {
        body: { roomId, language }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate analysis');
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        onAnalysisComplete?.(data.analysis);
        
        // Reload responses for metrics calculation
        await loadGameResponses();
        
        toast({
          title: 'GetClose AI Intelligence Complete',
          description: 'Your sophisticated relationship analysis is ready',
        });
      } else {
        throw new Error('Invalid response from AI Intelligence system');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error generating AI Intelligence analysis:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: 'Analysis Error',
        description: 'Unable to generate your intelligence report. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnalysisEmail = async () => {
    if (!roomId || !analysis) return;
    
    setIsEmailSending(true);

    try {
      logger.debug('Sending AI Intelligence analysis email', { roomId, language });
      
      const { data, error } = await supabase.functions.invoke('send-ai-analysis-email', {
        body: { roomId, language }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      if (data?.success) {
        toast({
          title: 'Intelligence Report Sent',
          description: 'Your premium analysis has been delivered to your email',
        });
      } else {
        throw new Error('Failed to send intelligence report');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error sending intelligence email:', errorMessage);
      
      toast({
        title: 'Email Error',
        description: 'Unable to send your report. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  if (!isVisible) return null;

  // Generate advanced metrics if we have analysis and responses
  const advancedMetrics = gameResponses.length > 0 ? calculatePsychologicalMetrics(gameResponses) : null;
  const intelligenceInsights = advancedMetrics && analysis ? 
    generateIntelligenceInsights(advancedMetrics, gameResponses) : null;

  return (
    <div className="space-y-6">
      {/* Main Analysis Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl shadow-primary/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  GetClose AI Intelligence
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Relationship Intelligence Powered by Psychology
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Premium Analysis
                  </Badge>
                </CardDescription>
              </div>
            </div>
            
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

        <CardContent className="space-y-6">
          {!analysis && !isLoading && !error && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Unlock Relationship Intelligence</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Get unprecedented insights into your connection with advanced psychological analysis powered by AI
                </p>
              </div>
              <Button 
                onClick={generateAnalysis}
                className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Generate Intelligence Report
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">AI Intelligence Processing</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyzing your relationship dynamics using advanced psychology frameworks...
                </p>
                <Progress value={65} className="w-full max-w-xs mx-auto h-2" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Activity className="w-3 h-3 animate-pulse" />
                Processing Bond Map • Communication DNA • Volatility Analysis
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-6 space-y-3">
              <div className="text-sm text-destructive mb-2">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateAnalysis}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {analysis && advancedMetrics && intelligenceInsights && (
            <div className="space-y-6">
              {/* Premium Intelligence Header */}
              <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-6 rounded-xl border border-primary/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {analysis.compatibilityScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Intelligence Score</div>
                    <Progress value={analysis.compatibilityScore} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Brain className="w-5 h-5 text-purple-500" />
                      <span className="font-semibold">{analysis.intelligenceMarkers?.rarityPercentile || '75th'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Percentile</div>
                    <div className="text-xs text-purple-600">
                      {intelligenceInsights.rarityMetrics.comparisonNote}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold">{analysis.intelligenceMarkers?.dataPoints || 16}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Data Points</div>
                    <div className="text-xs text-blue-600">
                      {analysis.intelligenceMarkers?.analysisDepth || 'Advanced Analysis'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold capitalize">{analysis.relationshipPhase}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Phase</div>
                    <div className="text-xs text-amber-600">
                      {intelligenceInsights.relationshipVelocity.direction}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Intelligence Layout */}
              <AdvancedIntelligenceLayout 
                metrics={advancedMetrics} 
                insights={intelligenceInsights}
                responses={gameResponses}
              />

              {/* Specific Moments Analysis */}
              {analysis.specificMoments && analysis.specificMoments.length > 0 && (
                <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <Target className="w-5 h-5" />
                      Breakthrough Moments
                    </CardTitle>
                    <CardDescription className="text-orange-700">
                      Key conversation highlights that triggered peak responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.specificMoments.map((moment, index) => (
                      <Card key={index} className="border border-orange-300 bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-orange-400 text-orange-700">
                                Question {moment.questionNumber}
                              </Badge>
                              <Badge variant="secondary" className="capitalize">
                                {moment.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-orange-600">{moment.score}/5</div>
                              <div className="text-xs text-orange-600">{moment.significance}</div>
                            </div>
                          </div>
                          <p className="text-sm text-orange-800">{moment.insight}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Response Quote Analysis */}
              {analysis.responseQuotes && analysis.responseQuotes.length > 0 && (
                <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-800">
                      <Heart className="w-5 h-5" />
                      Top Response Analysis
                    </CardTitle>
                    <CardDescription className="text-indigo-700">
                      Your highest-rated responses with detailed breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.responseQuotes.map((quote, index) => (
                      <Card key={index} className="border border-indigo-300 bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="outline" className="border-indigo-400 text-indigo-700">
                              Question {quote.questionIndex}
                            </Badge>
                            <div className="text-right">
                              <div className="text-lg font-bold text-indigo-600">{quote.overallScore}/5</div>
                              <div className="text-xs text-indigo-600">Overall Score</div>
                            </div>
                          </div>
                          <div className="bg-indigo-50 p-3 rounded-lg mb-3">
                            <p className="text-sm text-indigo-900 italic">"{quote.responsePreview}"</p>
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                              <div className="text-sm font-medium">{quote.breakdown.honesty}</div>
                              <div className="text-xs text-muted-foreground">Honesty</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">{quote.breakdown.attraction}</div>
                              <div className="text-xs text-muted-foreground">Attraction</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">{quote.breakdown.intimacy}</div>
                              <div className="text-xs text-muted-foreground">Intimacy</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">{quote.breakdown.surprise}</div>
                              <div className="text-xs text-muted-foreground">Surprise</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}

              {isExpanded && (
                <div className="space-y-6 animate-fade-in">
                  <Separator />
                  
                  {/* Intelligence Highlights */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Intelligence Highlights
                    </h3>
                    
                    {analysis.keyInsights.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.keyInsights.slice(0, 4).map((insight, index) => (
                          <Card key={index} className="border border-blue-200 bg-blue-50">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm text-blue-800">{insight}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Strength Areas */}
                  {analysis.strengthAreas.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Strength Analysis
                      </h3>
                      <div className="space-y-2">
                        {analysis.strengthAreas.map((strength, index) => (
                          <Card key={index} className="border border-emerald-200 bg-emerald-50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-emerald-600" />
                                  <span className="font-medium capitalize">{strength.area}</span>
                                </div>
                                <Badge variant="secondary" className="text-emerald-700">
                                  {strength.score}/10
                                </Badge>
                              </div>
                              <p className="text-sm text-emerald-700">{strength.insight}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intelligent Recommendations */}
                  {analysis.personalizedTips.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        Intelligent Recommendations
                      </h3>
                      <div className="space-y-2">
                        {analysis.personalizedTips.map((tip, index) => (
                          <Card key={index} className="border border-purple-200 bg-purple-50">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-purple-800">{tip}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email Report Button */}
                  <div className="text-center pt-4 border-t border-border/50">
                    <Button 
                      onClick={sendAnalysisEmail}
                      disabled={isEmailSending}
                      variant="outline"
                      className="gap-2"
                    >
                      {isEmailSending ? (
                        <Brain className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {isEmailSending ? 'Sending Premium Report...' : 'Email Full Intelligence Report'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Intelligence 2.0 Layout */}
      {analysis && advancedMetrics && intelligenceInsights && isExpanded && (
        <AdvancedIntelligenceLayout 
          metrics={advancedMetrics}
          insights={intelligenceInsights}
          responses={gameResponses}
        />
      )}
    </div>
  );
};
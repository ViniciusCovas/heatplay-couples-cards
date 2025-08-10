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
  Zap,
  Info,
  Users,
  Lightbulb
} from 'lucide-react';
import { ExplanationTooltip } from './ExplanationTooltip';
import { ExpandableSection } from './ExpandableSection';
import { ScoreInterpretation } from './ScoreInterpretation';
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
        setIsExpanded(true); // Auto-expand when existing analysis is loaded
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
      logger.debug('Loading game responses for room:', roomId);
      
      // First, fetch all game responses for this room
      const { data: responses, error: responsesError } = await supabase
        .from('game_responses')
        .select('response, response_time, evaluation, card_id')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (responsesError) {
        throw new Error(`Failed to fetch responses: ${responsesError.message}`);
      }

      if (!responses || responses.length === 0) {
        logger.warn('No game responses found for room:', roomId);
        setGameResponses([]);
        return;
      }

      // Extract unique card IDs from responses
      const cardIds = [...new Set(responses.map(r => r.card_id))].filter(Boolean);
      
      if (cardIds.length === 0) {
        logger.warn('No valid card IDs found in responses');
        setGameResponses([]);
        return;
      }

      // Fetch the corresponding questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, level_id')
        .in('id', cardIds);

      if (questionsError) {
        logger.error('Error fetching questions:', questionsError);
        // Continue with available data even if some questions can't be fetched
      }

      // Create a map of question ID to question data for fast lookup
      const questionMap = new Map();
      if (questions) {
        questions.forEach(q => {
          questionMap.set(q.id, q);
        });
      }

      // Combine responses with question data
      const gameResponses: GameResponse[] = responses.map(r => {
        const question = questionMap.get(r.card_id);
        return {
          question: question?.text || 'Unknown question',
          response: r.response || '',
          responseTime: r.response_time || 0,
          level: question?.level_id || 1,
          playerId: 'player',
          evaluation: r.evaluation ? (() => {
            try {
              return JSON.parse(r.evaluation);
            } catch (parseError) {
              logger.warn('Failed to parse evaluation:', parseError);
              return undefined;
            }
          })() : undefined
        };
      });

      logger.debug(`Successfully loaded ${gameResponses.length} game responses`);
      setGameResponses(gameResponses);
    } catch (err) {
      logger.error('Error loading game responses:', err);
      // Set empty array on error to prevent cascading failures
      setGameResponses([]);
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
        setIsExpanded(true); // Auto-expand after successful analysis generation
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
        // Don't reload the analysis after email is sent - this was causing duplication
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
              {/* Overview Summary Card */}
              <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Your Relationship Intelligence Summary</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Here's what our AI discovered about your connection
                      </CardDescription>
                    </div>
                    <ExplanationTooltip 
                      explanation="This summary combines advanced psychology with AI analysis to give you insights into your relationship dynamics, communication patterns, and compatibility."
                      term="Intelligence Summary"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Score Display */}
                  <div className="text-center space-y-4 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
                    <div className="space-y-2">
                      <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {analysis.compatibilityScore}%
                      </div>
                      <div className="text-lg font-medium">Overall Connection Score</div>
                      <div className="text-sm text-muted-foreground max-w-md mx-auto">
                        This score reflects the depth and quality of your emotional connection based on your responses
                      </div>
                    </div>
                    <Progress value={analysis.compatibilityScore} className="h-3 max-w-md mx-auto" />
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ScoreInterpretation
                      score={Math.round((analysis.compatibilityScore / 100) * 5)}
                      maxScore={5}
                      label="Connection Strength"
                      interpretation="Shows how well you understand and connect with each other emotionally."
                      percentile={`${analysis.intelligenceMarkers?.rarityPercentile || '75th'} percentile`}
                      showProgress={false}
                      className="border-purple-200 bg-purple-50"
                    />
                    
                    <div className="space-y-2 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Relationship Phase</span>
                        <ExplanationTooltip 
                          explanation="This identifies what stage your relationship is in based on communication patterns and intimacy levels."
                          term="Relationship Phase"
                        />
                      </div>
                      <div className="text-2xl font-bold capitalize text-amber-600">
                        {analysis.relationshipPhase}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {intelligenceInsights.relationshipVelocity.direction}
                      </div>
                    </div>

                    <div className="space-y-2 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Analysis Depth</span>
                        <ExplanationTooltip 
                          explanation="This shows how much data we analyzed to create your report - more data points mean more accurate insights."
                          term="Analysis Depth"
                        />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.intelligenceMarkers?.dataPoints || 16}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Data points analyzed
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

              {/* Top Questions Analysis - Fixed to show questions instead of responses */}
              {analysis.responseQuotes && analysis.responseQuotes.length > 0 && (
                <ExpandableSection
                  title="Top Questions Analysis"
                  icon={<Heart className="w-4 h-4 text-indigo-600" />}
                  description="The questions that sparked your most meaningful responses"
                  className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-indigo-700 mb-4">
                      <Info className="w-4 h-4" />
                      These questions generated the highest-quality responses, showing deep engagement and authenticity.
                    </div>
                    {analysis.responseQuotes.map((quote, index) => (
                      <Card key={index} className="border border-indigo-300 bg-white/70">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline" className="border-indigo-400 text-indigo-700">
                              Question {quote.questionIndex + 1}
                            </Badge>
                            <div className="text-right">
                              <div className="text-lg font-bold text-indigo-600">{quote.overallScore}/5</div>
                              <div className="text-xs text-indigo-600">Response Quality</div>
                            </div>
                          </div>
                          
                          {/* Show the question instead of the response */}
                          <div className="bg-indigo-100 p-4 rounded-lg border-l-4 border-indigo-400">
                            <div className="text-xs uppercase tracking-wide text-indigo-600 mb-1">Question Asked</div>
                            <p className="text-sm text-indigo-900 font-medium">"{quote.questionText}"</p>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-emerald-600">{quote.breakdown.honesty}</div>
                              <div className="text-xs text-muted-foreground">Honesty</div>
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-pink-600">{quote.breakdown.attraction}</div>
                              <div className="text-xs text-muted-foreground">Attraction</div>
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-purple-600">{quote.breakdown.intimacy}</div>
                              <div className="text-xs text-muted-foreground">Intimacy</div>
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-amber-600">{quote.breakdown.surprise}</div>
                              <div className="text-xs text-muted-foreground">Surprise</div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded">
                            💡 This question sparked authentic, engaging responses that revealed deeper connection
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ExpandableSection>
              )}

              {/* Enhanced Detailed Analysis Sections */}
              <div className="space-y-6">
                <Separator className="my-8" />
                
                {/* Key Insights Section */}
                {analysis.keyInsights.length > 0 && (
                  <ExpandableSection
                    title="Key Relationship Insights"
                    icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
                    description="The most important discoveries about your connection"
                    defaultExpanded={true}
                    className="border-amber-200 bg-amber-50"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-amber-700 mb-4">
                        <Info className="w-4 h-4" />
                        These insights are based on patterns in your responses and communication style.
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {analysis.keyInsights.map((insight, index) => (
                          <Card key={index} className="border border-amber-300 bg-white/70">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-sm font-bold text-amber-700">{index + 1}</span>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm text-amber-900 leading-relaxed">{insight}</p>
                                  <div className="text-xs text-amber-600">
                                    💡 This insight helps you understand your relationship dynamic better
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </ExpandableSection>
                )}

                {/* Strength Areas */}
                {analysis.strengthAreas.length > 0 && (
                  <ExpandableSection
                    title="Your Relationship Strengths"
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                    description="What you're already doing well together"
                    className="border-emerald-200 bg-emerald-50"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 mb-4">
                        <Info className="w-4 h-4" />
                        These are areas where you both excel and should continue nurturing.
                      </div>
                      {analysis.strengthAreas.map((strength, index) => (
                        <ScoreInterpretation
                          key={index}
                          score={strength.score}
                          maxScore={10}
                          label={strength.area}
                          interpretation={strength.insight}
                          className="border-emerald-300 bg-white/70"
                        />
                      ))}
                    </div>
                  </ExpandableSection>
                )}

                {/* Growth Areas */}
                {analysis.growthAreas.length > 0 && (
                  <ExpandableSection
                    title="Growth Opportunities"
                    icon={<Target className="w-4 h-4 text-blue-600" />}
                    description="Areas with the most potential for deepening your connection"
                    className="border-blue-200 bg-blue-50"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-blue-700 mb-4">
                        <Info className="w-4 h-4" />
                        These aren't weaknesses - they're opportunities to grow even closer together.
                      </div>
                      {analysis.growthAreas.map((growth, index) => (
                        <Card key={index} className="border border-blue-300 bg-white/70">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-600" />
                                <span className="font-medium capitalize">{growth.area}</span>
                              </div>
                              <Badge variant="outline" className="border-blue-400 text-blue-700">
                                {growth.score}/10
                              </Badge>
                            </div>
                            <p className="text-sm text-blue-800 leading-relaxed">{growth.recommendation}</p>
                            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                              🎯 Focus area for your next conversation sessions
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ExpandableSection>
                )}

                {/* Actionable Recommendations */}
                {analysis.personalizedTips.length > 0 && (
                  <ExpandableSection
                    title="Your Next Steps"
                    icon={<Sparkles className="w-4 h-4 text-purple-600" />}
                    description="Specific actions to strengthen your relationship"
                    className="border-purple-200 bg-purple-50"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-purple-700 mb-4">
                        <Info className="w-4 h-4" />
                        These recommendations are tailored specifically to your relationship dynamic.
                      </div>
                      <div className="space-y-3">
                        {analysis.personalizedTips.map((tip, index) => (
                          <Card key={index} className="border border-purple-300 bg-white/70">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Sparkles className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm text-purple-900 leading-relaxed">{tip}</p>
                                  <div className="text-xs text-purple-600">
                                    ✨ Try this in your next conversation
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </ExpandableSection>
                )}

                {/* Email Report Section */}
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Want to keep this analysis?</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get your complete intelligence report delivered to your email for future reference
                        </p>
                      </div>
                      <Button 
                        onClick={sendAnalysisEmail}
                        disabled={isEmailSending}
                        size="lg"
                        className="gap-2"
                      >
                        {isEmailSending ? (
                          <Brain className="w-4 h-4 animate-pulse" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        {isEmailSending ? 'Sending Report...' : 'Email My Intelligence Report'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Intelligence Dashboard */}
      {analysis && advancedMetrics && intelligenceInsights && (
        <ExpandableSection
          title="Advanced Psychology Dashboard"
          icon={<Brain className="w-4 h-4 text-primary" />}
          description="Deep psychological analysis of your relationship patterns"
          className="border-primary/20 bg-primary/5"
        >
          <AdvancedIntelligenceLayout 
            metrics={advancedMetrics}
            insights={intelligenceInsights}
            responses={gameResponses}
          />
        </ExpandableSection>
      )}
    </div>
  );
};
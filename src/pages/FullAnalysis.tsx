import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Heart, Users, Lightbulb, TrendingUp, Share2, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BondMap3D } from '@/components/insights/BondMap3D';
import { ExplanationTooltip } from '@/components/insights/ExplanationTooltip';
import { ExpandableSection } from '@/components/insights/ExpandableSection';
import { ScoreInterpretation } from '@/components/insights/ScoreInterpretation';
import { calculatePsychologicalMetrics, generateIntelligenceInsights } from '@/utils/psychologicalAnalysis';

interface AnalysisData {
  compatibilityScore: number;
  strengthAreas: string[];
  growthAreas: string[];
  keyInsights: string[];
  personalizedTips: string[];
  culturalNotes: string[];
  relationshipPhase: string;
  nextSessionRecommendations: string[];
}

export default function FullAnalysis() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [psychMetrics, setPsychMetrics] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    if (roomCode) {
      loadAnalysisData();
    }
  }, [roomCode]);

  const loadAnalysisData = async () => {
    if (!roomCode) return;
    
    try {
      setIsLoading(true);
      
      // Get room info
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', roomCode)
        .single();

      if (!room) {
        setError('Room not found');
        return;
      }

      // Get existing analysis
      const { data: analysisData } = await supabase
        .from('ai_analyses')
        .select('ai_response')
        .eq('room_id', room.id)
        .eq('analysis_type', 'getclose-ai-analysis')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (analysisData?.ai_response && typeof analysisData.ai_response === 'object') {
        setAnalysis(analysisData.ai_response as unknown as AnalysisData);
      }

      // Get game responses for psychological metrics  
      const { data: gameResponses } = await supabase
        .from('game_responses')
        .select('*, questions(question_text)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      if (gameResponses) {
        setResponses(gameResponses);
        
        // Calculate psychological metrics
        const formattedResponses = gameResponses.map(resp => {
          let evaluation = undefined;
          if (resp.evaluation && typeof resp.evaluation === 'string') {
            try {
              const parsed = JSON.parse(resp.evaluation);
              evaluation = {
                honesty: parsed.honesty || 0,
                attraction: parsed.attraction || 0,
                intimacy: parsed.intimacy || 0,
                surprise: parsed.surprise || 0
              };
            } catch (e) {
              console.warn('Failed to parse evaluation:', e);
            }
          }

          return {
            question: (resp.questions as any)?.question_text || 'Question text not available',
            response: resp.response || '',
            responseTime: resp.response_time || 0,
            level: resp.round_number || 1,
            playerId: resp.player_id,
            evaluation
          };
        });

        const metrics = calculatePsychologicalMetrics(formattedResponses);
        setPsychMetrics(metrics);
      }

    } catch (err) {
      console.error('Error loading analysis:', err);
      setError('Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnalysisEmail = async () => {
    if (!analysis || !roomCode) return;
    
    try {
      setIsEmailLoading(true);
      
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', roomCode)
        .single();

      if (!room) {
        toast({ title: "Error", description: "Room not found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.functions.invoke('send-ai-analysis-email', {
        body: { roomId: room.id, language: 'en' }
      });

      if (error) throw error;

      toast({
        title: "Email sent successfully!",
        description: "The analysis has been sent to your email."
      });
    } catch (err) {
      console.error('Error sending email:', err);
      toast({
        title: "Error sending email",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 90) return "Exceptional connection with remarkable depth";
    if (score >= 80) return "Strong foundation with excellent potential";
    if (score >= 70) return "Good compatibility with room for growth";
    if (score >= 60) return "Developing connection with positive indicators";
    if (score >= 50) return "Early stage with promising signs";
    return "Foundation building phase";
  };

  const getPercentileContext = (score: number) => {
    const percentile = Math.min(95, Math.max(5, score * 0.95));
    if (percentile >= 90) return `Top ${100 - percentile}% of couples`;
    if (percentile >= 70) return `Better than ${percentile}% of couples`;
    if (percentile >= 50) return `Above average performance`;
    return `Building strong foundation`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Analysis Not Available</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'No analysis data found for this room.'}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const compatibilityScore = Math.min(100, Math.max(0, analysis.compatibilityScore || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">AI Intelligence Report</h1>
              <p className="text-sm text-muted-foreground">Room: {roomCode}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={sendAnalysisEmail}
              disabled={isEmailLoading}
            >
              <Mail className="w-4 h-4 mr-2" />
              {isEmailLoading ? 'Sending...' : 'Email Report'}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Overview Section */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Your Connection Story</CardTitle>
                <p className="text-muted-foreground">AI-powered relationship insights</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Compatibility Score */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {compatibilityScore}
                  </span>
                  <span className="text-2xl text-muted-foreground">%</span>
                  <ExplanationTooltip 
                    explanation="This score represents the overall compatibility based on emotional depth, communication style, shared values, and relationship dynamics analyzed from your interactions."
                    term="Compatibility Score"
                  />
                </div>
                <Progress value={compatibilityScore} className="w-64 mx-auto h-3" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-primary">
                  {getScoreInterpretation(compatibilityScore)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getPercentileContext(compatibilityScore)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Metrics Overview */}
            <div className="grid md:grid-cols-3 gap-4">
              <ScoreInterpretation
                score={analysis.strengthAreas?.length || 0}
                maxScore={10}
                label="Strength Areas"
                interpretation="Areas where you naturally excel together"
                showProgress={false}
              />
              
              <ScoreInterpretation
                score={responses.length}
                maxScore={20}
                label="Questions Explored"
                interpretation="Depth of your conversation journey"
                showProgress={false}
              />
              
              <ScoreInterpretation
                score={analysis.keyInsights?.length || 0}
                maxScore={10}
                label="Key Insights"
                interpretation="Unique discoveries about your connection"
                showProgress={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bond Map Visualization */}
        {psychMetrics && (
          <BondMap3D 
            bondMap={psychMetrics.bondMap}
            volatility={psychMetrics.volatility}
            trends={{
              closeness: psychMetrics.progression.trend,
              spark: psychMetrics.progression.trend,
              anchor: psychMetrics.progression.trend
            }}
          />
        )}

        {/* Detailed Analysis Sections */}
        <div className="space-y-6">
          {/* Strengths */}
          {analysis.strengthAreas && analysis.strengthAreas.length > 0 && (
            <ExpandableSection
              title="Your Unique Strengths"
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              description="Areas where you naturally excel as a couple"
              defaultExpanded={true}
            >
              <div className="space-y-4">
                {analysis.strengthAreas.map((strength, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Badge variant="secondary" className="mt-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      {index + 1}
                    </Badge>
                    <p className="text-sm leading-relaxed">{strength}</p>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Key Insights */}
          {analysis.keyInsights && analysis.keyInsights.length > 0 && (
            <ExpandableSection
              title="Key Insights"
              icon={<Lightbulb className="w-5 h-5 text-yellow-600" />}
              description="Important discoveries about your relationship dynamics"
            >
              <div className="space-y-4">
                {analysis.keyInsights.map((insight, index) => (
                  <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Growth Areas */}
          {analysis.growthAreas && analysis.growthAreas.length > 0 && (
            <ExpandableSection
              title="Growth Opportunities"
              icon={<Users className="w-5 h-5 text-blue-600" />}
              description="Areas where you can strengthen your connection"
            >
              <div className="space-y-4">
                {analysis.growthAreas.map((area, index) => (
                  <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm leading-relaxed">{area}</p>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Personalized Tips */}
          {analysis.personalizedTips && analysis.personalizedTips.length > 0 && (
            <ExpandableSection
              title="Personalized Recommendations"
              icon={<Heart className="w-5 h-5 text-red-600" />}
              description="Specific actions to deepen your connection"
            >
              <div className="space-y-4">
                {analysis.personalizedTips.map((tip, index) => (
                  <div key={index} className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}
        </div>

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ready for Your Next Session?</h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Based on your analysis, we recommend continuing your journey with deeper questions 
                to explore the insights discovered in this session.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => navigate('/create-room')}>
                  Start New Session
                </Button>
                <Button variant="outline" onClick={sendAnalysisEmail} disabled={isEmailLoading}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email This Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
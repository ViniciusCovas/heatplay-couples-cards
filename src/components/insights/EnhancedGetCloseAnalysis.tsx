import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, ExternalLink, Loader2, TrendingUp, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    if (roomId && isVisible) {
      loadExistingAnalysis();
      loadRoomCode();
    }
  }, [roomId, isVisible]);

  const loadExistingAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('ai_response')
        .eq('room_id', roomId)
        .eq('analysis_type', 'getclose-ai-analysis')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading analysis:', error);
        return;
      }

      if (data?.ai_response) {
        setAnalysis(data.ai_response as unknown as AnalysisData);
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
    }
  };

  const loadRoomCode = async () => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('room_code')
        .eq('id', roomId)
        .single();

      if (data) {
        setRoomCode(data.room_code);
      }
    } catch (err) {
      console.error('Error loading room code:', err);
    }
  };


  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('getclose-ai-analysis', {
        body: { roomId, language }
      });

      if (error) {
        throw error;
      }

      if (data?.analysis) {
        const analysisData = data.analysis as AnalysisData;
        setAnalysis(analysisData);
        onAnalysisComplete?.(analysisData);
        
        toast({
          title: "Analysis completed!",
          description: "Your AI relationship intelligence report is ready."
        });
      }
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError('Failed to generate analysis. Please try again.');
      toast({
        title: "Analysis failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewFullAnalysis = () => {
    if (roomCode) {
      navigate(`/analysis/${roomCode}`);
    }
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 90) return "Exceptional connection";
    if (score >= 80) return "Strong foundation";
    if (score >= 70) return "Good compatibility";
    if (score >= 60) return "Developing connection";
    return "Building foundation";
  };

  if (!isVisible) return null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Intelligence Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">Advanced psychological analysis</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {!analysis ? (
          <div className="text-center py-12 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Generate Your Intelligence Report</h3>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Get AI-powered insights about your relationship dynamics, communication patterns, and compatibility based on your conversation.
              </p>
            </div>
            <Button 
              onClick={generateAnalysis}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Analysis Summary Card */}
            <div className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 rounded-xl p-8 border border-primary/20 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {Math.min(100, Math.max(0, analysis.compatibilityScore || 0))}
                  </span>
                  <span className="text-2xl text-muted-foreground">%</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-primary">
                    {getScoreInterpretation(Math.min(100, Math.max(0, analysis.compatibilityScore || 0)))}
                  </h3>
                  <p className="text-muted-foreground">Compatibility Score</p>
                </div>
                <Progress 
                  value={Math.min(100, Math.max(0, analysis.compatibilityScore || 0))} 
                  className="w-64 mx-auto h-3" 
                />
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={viewFullAnalysis}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Analysis
                </Button>
              </div>
            </div>

            {/* Quick Insights Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Your Strengths
                </h4>
                <div className="space-y-3">
                  {(analysis.strengthAreas || []).slice(0, 2).map((strength, index) => (
                    <div key={index} className="text-sm bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800 leading-relaxed">
                      {strength.length > 100 ? `${strength.substring(0, 100)}...` : strength}
                    </div>
                  ))}
                  {(analysis.strengthAreas || []).length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{(analysis.strengthAreas || []).length - 2} more in full report
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Key Insights
                </h4>
                <div className="space-y-3">
                  {(analysis.keyInsights || []).slice(0, 2).map((insight, index) => (
                    <div key={index} className="text-sm bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 leading-relaxed">
                      {insight.length > 100 ? `${insight.substring(0, 100)}...` : insight}
                    </div>
                  ))}
                  {(analysis.keyInsights || []).length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{(analysis.keyInsights || []).length - 2} more in full report
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="text-center py-8 space-y-4">
            <div className="text-red-600 dark:text-red-400">
              <p className="text-sm">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={generateAnalysis}
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
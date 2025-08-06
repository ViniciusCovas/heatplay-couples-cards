import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageCircle, Star, Heart, Brain, Zap, Target } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface TimelineNode {
  id: string;
  roundNumber: number;
  question: string;
  response: string;
  responseTime: number;
  evaluation: any;
  level: number;
  aiReasoning?: string | null;
}

interface InteractiveTimelineProps {
  insights: ConnectionInsightsData;
}

export const InteractiveTimeline = ({ insights }: InteractiveTimelineProps) => {
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);

  // Fetch detailed timeline data
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline', insights.sessionData.roomCode],
    queryFn: async (): Promise<TimelineNode[]> => {
      // Get room first
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', insights.sessionData.roomCode)
        .single();

      if (!room) return [];

      // Get responses with questions
      const { data: responses } = await supabase
        .from('game_responses')
        .select(`
          id,
          round_number,
          response,
          response_time,
          evaluation,
          ai_reasoning,
          card_id
        `)
        .eq('room_id', room.id)
        .order('round_number');

      // Get questions for the session level
      const { data: questions } = await supabase
        .from('questions')
        .select('id, text, level_id')
        .eq('language', 'en'); // Assuming English for now

      // Get level info
      const { data: levels } = await supabase
        .from('levels')
        .select('id, sort_order')
        .eq('language', 'en');

      // Transform data
      return responses?.map(response => {
        const question = questions?.find(q => q.id === response.card_id);
        const level = levels?.find(l => l.id === question?.level_id);
        
        return {
          id: response.id,
          roundNumber: response.round_number,
          question: question?.text || 'Question not found',
          response: response.response || '',
          responseTime: response.response_time || 0,
          evaluation: response.evaluation ? JSON.parse(response.evaluation) : null,
          level: level?.sort_order || 1,
          aiReasoning: response.ai_reasoning,
        };
      }) || [];
    },
  });

  const getEvaluationIcon = (evaluation: any) => {
    if (!evaluation) return <MessageCircle className="w-4 h-4" />;
    
    const avgScore = (evaluation.honesty + evaluation.attraction + evaluation.intimacy + evaluation.surprise) / 4;
    if (avgScore >= 4) return <Star className="w-4 h-4 text-yellow-500" />;
    if (avgScore >= 3) return <Heart className="w-4 h-4 text-pink-500" />;
    return <Brain className="w-4 h-4 text-blue-500" />;
  };

  const getNodeColor = (level: number) => {
    const colors = {
      1: 'bg-green-500',
      2: 'bg-blue-500', 
      3: 'bg-purple-500',
      4: 'bg-red-500'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <Card className="mb-12">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your connection journey...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Your Connection Journey
        </h2>
        <p className="text-muted-foreground">
          Tap any moment to explore your responses and insights
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          {/* Timeline container with horizontal scroll */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-4 min-w-max">
              {timelineData?.map((node, index) => (
                <Dialog key={node.id}>
                  <DialogTrigger asChild>
                    <div className="flex flex-col items-center cursor-pointer hover-scale group">
                      {/* Timeline line */}
                      {index > 0 && (
                        <div className="w-16 h-0.5 bg-gradient-to-r from-primary/50 to-primary mb-4 group-hover:from-primary group-hover:to-secondary transition-all duration-300"></div>
                      )}
                      
                      {/* Node */}
                      <div className={`w-16 h-16 rounded-full ${getNodeColor(node.level)} flex items-center justify-center shadow-lg border-4 border-white group-hover:scale-110 transition-transform duration-300`}>
                        {getEvaluationIcon(node.evaluation)}
                      </div>
                      
                      {/* Round number */}
                      <div className="text-xs font-medium text-muted-foreground mt-2">
                        Q{node.roundNumber}
                      </div>
                      
                      {/* Response time indicator */}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{node.responseTime}s</span>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Badge className={`${getNodeColor(node.level)} text-white`}>
                          Level {node.level}
                        </Badge>
                        Question {node.roundNumber}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Question */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Question</h4>
                        <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg italic">
                          "{node.question}"
                        </p>
                      </div>
                      
                      {/* Response */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Your Response</h4>
                        <p className="text-foreground bg-primary/5 p-4 rounded-lg border border-primary/20">
                          {node.response || 'No response recorded'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Responded in {node.responseTime} seconds
                        </div>
                      </div>
                      
                      {/* Evaluation scores */}
                      {node.evaluation && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-3">Partner's Evaluation</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">Honesty</span>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-4 h-4 ${i < node.evaluation.honesty ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-bold">{node.evaluation.honesty}/5</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">Attraction</span>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Heart 
                                      key={i} 
                                      className={`w-4 h-4 ${i < node.evaluation.attraction ? 'text-pink-500 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-bold">{node.evaluation.attraction}/5</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">Intimacy</span>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Zap 
                                      key={i} 
                                      className={`w-4 h-4 ${i < node.evaluation.intimacy ? 'text-purple-500 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-bold">{node.evaluation.intimacy}/5</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">Surprise</span>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-4 h-4 ${i < node.evaluation.surprise ? 'text-orange-500 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-bold">{node.evaluation.surprise}/5</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* AI Reasoning */}
                      {node.aiReasoning && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            AI Insight
                          </h4>
                          <p className="text-muted-foreground bg-accent/10 p-4 rounded-lg border border-accent/20">
                            {node.aiReasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
          
          {/* Timeline legend */}
          <div className="flex justify-center mt-6">
            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">Level 1 - Spark</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-muted-foreground">Level 2 - Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-muted-foreground">Level 3 - Fire</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">Level 4 - No Filter</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
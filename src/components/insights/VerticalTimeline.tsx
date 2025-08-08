import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MessageCircle, Star, Heart, Brain, Zap, Target, TrendingUp, ChevronDown } from 'lucide-react';
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

interface VerticalTimelineProps {
  insights: ConnectionInsightsData;
}

export const VerticalTimeline = ({ insights }: VerticalTimelineProps) => {
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Fetch detailed timeline data
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline', insights.sessionData.roomCode],
    queryFn: async (): Promise<TimelineNode[]> => {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', insights.sessionData.roomCode)
        .single();

      if (!room) return [];

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

      const { data: questions } = await supabase
        .from('questions')
        .select('id, text, level_id')
        .eq('language', 'en');

      const { data: levels } = await supabase
        .from('levels')
        .select('id, sort_order')
        .eq('language', 'en');

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

  const getIntensityScore = (evaluation: any) => {
    if (!evaluation) return 0;
    return (evaluation.honesty + evaluation.attraction + evaluation.intimacy + evaluation.surprise) / 4;
  };

  const getNodeStyle = (node: TimelineNode, index: number) => {
    const intensity = getIntensityScore(node.evaluation);
    const isBreakthrough = intensity >= 4.0;
    
    const levelColors = {
      1: 'from-emerald-400 to-emerald-600',
      2: 'from-blue-400 to-blue-600', 
      3: 'from-purple-400 to-purple-600',
      4: 'from-red-400 to-red-600'
    };
    
    const gradient = levelColors[node.level as keyof typeof levelColors] || 'from-gray-400 to-gray-600';
    
    return {
      nodeClass: `w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg border-4 border-background relative z-10 ${isBreakthrough ? 'ring-4 ring-yellow-300 ring-opacity-50' : ''}`,
      lineClass: `w-1 bg-gradient-to-b ${gradient} opacity-30`,
      intensity: isBreakthrough
    };
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
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

  const displayedData = showAll ? timelineData : timelineData?.slice(0, 5);
  const hasMore = (timelineData?.length || 0) > 5;

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
          <Target className="w-7 h-7 text-primary" />
          Your Connection Journey
        </h2>
        <p className="text-muted-foreground text-lg">
          Explore each moment that shaped your connection
        </p>
      </div>

      <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20 shadow-xl">
        <CardContent className="p-8">
          <div className="relative">
            {displayedData?.map((node, index) => {
              const style = getNodeStyle(node, index);
              const isLast = index === displayedData.length - 1;
              
              return (
                <div key={node.id} className="relative flex items-start gap-6 pb-8">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-8 top-16 bottom-0 w-1 bg-gradient-to-b from-primary/30 to-primary/10"></div>
                  )}
                  
                  {/* Node */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className={`${style.nodeClass} cursor-pointer hover-scale group transition-all duration-300`}>
                        {style.intensity && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-yellow-800" />
                          </div>
                        )}
                        <span className="text-white font-bold text-lg">{node.roundNumber}</span>
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl">
                          <Badge className={`bg-gradient-to-r ${style.nodeClass.includes('emerald') ? 'from-emerald-500 to-emerald-600' : style.nodeClass.includes('blue') ? 'from-blue-500 to-blue-600' : style.nodeClass.includes('purple') ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'} text-white border-0`}>
                            Level {node.level}
                          </Badge>
                          Question {node.roundNumber}
                          {style.intensity && <Star className="w-5 h-5 text-yellow-500" />}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Question */}
                        <div className="bg-muted/30 p-6 rounded-xl border border-muted-foreground/10">
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            The Question
                          </h4>
                          <p className="text-muted-foreground text-lg italic leading-relaxed">
                            "{node.question}"
                          </p>
                        </div>
                        
                        {/* Response */}
                        <div className="bg-primary/5 p-6 rounded-xl border border-primary/20">
                          <h4 className="font-semibold text-foreground mb-3">Your Response</h4>
                          <p className="text-foreground leading-relaxed mb-3">
                            {node.response || 'No response recorded'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            Responded in {formatResponseTime(node.responseTime)}
                          </div>
                        </div>
                        
                        {/* Evaluation scores */}
                        {node.evaluation && (
                          <div className="bg-background/50 p-6 rounded-xl border border-border/50">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                              <Heart className="w-5 h-5 text-pink-500" />
                              Partner's Evaluation
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                { key: 'honesty', label: 'Honesty', icon: Brain, color: 'blue' },
                                { key: 'attraction', label: 'Attraction', icon: Heart, color: 'pink' },
                                { key: 'intimacy', label: 'Intimacy', icon: Zap, color: 'purple' },
                                { key: 'surprise', label: 'Surprise', icon: Star, color: 'orange' }
                              ].map(({ key, label, icon: Icon, color }) => (
                                <div key={key} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 text-${color}-500`} />
                                    <span className="font-medium">{label}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`w-4 h-4 ${i < node.evaluation[key] ? `text-${color}-500 fill-current` : 'text-muted-foreground/30'}`} 
                                        />
                                      ))}
                                    </div>
                                    <span className="font-bold text-lg">{node.evaluation[key]}/5</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Overall intensity */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">Connection Intensity</span>
                                <span className="font-bold text-xl text-primary">
                                  {getIntensityScore(node.evaluation).toFixed(1)}/5
                                </span>
                              </div>
                              <div className="w-full bg-muted/30 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${(getIntensityScore(node.evaluation) / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* AI Reasoning */}
                        {node.aiReasoning && (
                          <div className="bg-accent/5 p-6 rounded-xl border border-accent/20">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Brain className="w-5 h-5 text-accent" />
                              AI Insight
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                              {node.aiReasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="bg-background/50 backdrop-blur-sm border border-border/30 rounded-xl p-6 hover-scale transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">
                            Question {node.roundNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Level {node.level} • {formatResponseTime(node.responseTime)}
                          </p>
                        </div>
                        {style.intensity && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Breakthrough
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {node.question}
                      </p>
                      
                      {node.evaluation && (
                        <div className="flex gap-2">
                          <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Intensity: {getIntensityScore(node.evaluation).toFixed(1)}/5
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Show more button */}
            {hasMore && !showAll && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAll(true)}
                  className="bg-background/50 backdrop-blur-sm"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show {(timelineData?.length || 0) - 5} More Questions
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
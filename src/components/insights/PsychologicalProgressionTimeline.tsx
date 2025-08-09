import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GameResponse } from '@/utils/connectionAlgorithm';
import { PsychologicalMetrics } from '@/utils/psychologicalAnalysis';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Star, 
  Zap, 
  Heart,
  Shield,
  Activity,
  ChevronRight,
  Timer
} from 'lucide-react';

interface PsychologicalProgressionTimelineProps {
  metrics: PsychologicalMetrics;
  responses: GameResponse[];
}

export const PsychologicalProgressionTimeline: React.FC<PsychologicalProgressionTimelineProps> = ({
  metrics,
  responses
}) => {
  const [selectedMoment, setSelectedMoment] = useState<number | null>(null);
  
  const evaluatedResponses = responses.filter(r => r.evaluation);
  
  const getBreakthroughIcon = (type: string) => {
    switch (type) {
      case 'honesty_surge': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'intimacy_peak': return <Heart className="w-4 h-4 text-red-500" />;
      case 'attraction_spark': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'surprise_moment': return <Star className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-blue-500" />;
    }
  };

  const getOverallScore = (response: GameResponse) => {
    if (!response.evaluation) return 0;
    return (
      response.evaluation.honesty + 
      response.evaluation.attraction + 
      response.evaluation.intimacy + 
      response.evaluation.surprise
    ) / 4;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'bg-emerald-500';
    if (score >= 3.0) return 'bg-blue-500';
    if (score >= 2.0) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const formatResponseTime = (time: number) => {
    if (time < 60) return `${time}s`;
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Activity className="w-3 h-3 text-white" />
          </div>
          Psychological Progression Timeline
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {getTrendIcon(metrics.progression.trend)}
            <span className="capitalize">{metrics.progression.trend} trend</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>{Math.abs(metrics.progression.momentum * 100).toFixed(1)}% momentum</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>{metrics.highlights.breakthroughMoments.length} breakthroughs</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Timeline visualization */}
        <div className="relative">
          {/* Timeline base line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10"></div>
          
          {/* Timeline events */}
          <div className="space-y-6">
            {evaluatedResponses.map((response, index) => {
              const overallScore = getOverallScore(response);
              const isBreakthrough = metrics.highlights.breakthroughMoments.find(
                b => b.questionIndex === index
              );
              const isPeak = metrics.progression.peaks.includes(index);
              
              return (
                <div 
                  key={index}
                  className="relative flex items-start gap-4 group cursor-pointer"
                  onClick={() => setSelectedMoment(selectedMoment === index ? null : index)}
                >
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-lg flex-shrink-0 ${
                    isBreakthrough ? getScoreColor(overallScore) : 
                    isPeak ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                    'bg-gradient-to-br from-primary/60 to-secondary/60'
                  } ${isBreakthrough || isPeak ? 'animate-pulse' : ''}`}>
                    {(isBreakthrough || isPeak) && (
                      <div className="absolute -inset-1 rounded-full bg-current opacity-20 animate-ping"></div>
                    )}
                  </div>
                  
                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <Card className={`transition-all duration-200 ${
                      selectedMoment === index ? 'ring-2 ring-primary/50 shadow-lg' : 
                      'hover:shadow-md border-border/50'
                    } ${isBreakthrough ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Q{index + 1}
                              </Badge>
                              {isBreakthrough && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  {getBreakthroughIcon(isBreakthrough.type)}
                                  Breakthrough
                                </Badge>
                              )}
                              {isPeak && (
                                <Badge variant="default" className="text-xs gap-1 bg-yellow-500">
                                  <Star className="w-3 h-3" />
                                  Peak
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium line-clamp-2">
                              {response.question}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <div className={`px-2 py-1 rounded text-xs font-semibold text-white ${getScoreColor(overallScore)}`}>
                              {overallScore.toFixed(1)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Timer className="w-3 h-3" />
                              {formatResponseTime(response.responseTime || 0)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Detailed metrics - collapsed by default */}
                        {selectedMoment === index && response.evaluation && (
                          <div className="space-y-3 animate-fade-in">
                            <div className="border-t border-border/50 pt-3">
                              <p className="text-sm text-muted-foreground mb-2 italic">
                                "{response.response}"
                              </p>
                            </div>
                            
                            {/* Evaluation breakdown */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm">Honesty</span>
                                </div>
                                <Badge variant="outline">{response.evaluation.honesty}/5</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm">Attraction</span>
                                </div>
                                <Badge variant="outline">{response.evaluation.attraction}/5</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-red-500" />
                                  <span className="text-sm">Intimacy</span>
                                </div>
                                <Badge variant="outline">{response.evaluation.intimacy}/5</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span className="text-sm">Surprise</span>
                                </div>
                                <Badge variant="outline">{response.evaluation.surprise}/5</Badge>
                              </div>
                            </div>
                            
                            {/* Breakthrough insight */}
                            {isBreakthrough && (
                              <div className="bg-primary/10 p-3 rounded border border-primary/20">
                                <div className="flex items-start gap-2">
                                  {getBreakthroughIcon(isBreakthrough.type)}
                                  <div>
                                    <div className="font-medium text-sm text-primary">
                                      Breakthrough Insight
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {isBreakthrough.insight}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Expand indicator */}
                        <div className="flex items-center justify-center mt-2">
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                            {selectedMoment === index ? 'Show Less' : 'Show Details'}
                            <ChevronRight className={`w-3 h-3 transition-transform ${
                              selectedMoment === index ? 'rotate-90' : ''
                            }`} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Timeline summary */}
          {evaluatedResponses.length > 0 && (
            <div className="mt-8 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded border border-primary/20">
              <div className="text-center">
                <div className="text-sm font-medium mb-2">Session Journey Summary</div>
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {evaluatedResponses.length} responses analyzed
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {metrics.highlights.breakthroughMoments.length} breakthrough moments
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metrics.progression.trend)}
                    {metrics.progression.trend} overall progression
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
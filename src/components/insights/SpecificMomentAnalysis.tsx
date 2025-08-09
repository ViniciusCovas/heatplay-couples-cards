import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GameResponse } from '@/utils/connectionAlgorithm';
import { PsychologicalMetrics } from '@/utils/psychologicalAnalysis';
import { 
  Quote,
  Star, 
  Zap, 
  Heart,
  Shield,
  TrendingUp,
  Clock,
  Target,
  Lightbulb,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

interface SpecificMomentAnalysisProps {
  metrics: PsychologicalMetrics;
  responses: GameResponse[];
}

export const SpecificMomentAnalysis: React.FC<SpecificMomentAnalysisProps> = ({
  metrics,
  responses
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'breakthroughs' | 'peaks' | 'patterns'>('breakthroughs');
  
  const evaluatedResponses = responses.filter(r => r.evaluation);
  
  const getResponseForMoment = (questionIndex: number) => {
    return evaluatedResponses[questionIndex];
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'text-emerald-600 bg-emerald-100';
    if (score >= 3.0) return 'text-blue-600 bg-blue-100';
    if (score >= 2.0) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getBreakthroughIcon = (type: string) => {
    switch (type) {
      case 'honesty_surge': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'intimacy_peak': return <Heart className="w-5 h-5 text-red-500" />;
      case 'attraction_spark': return <Zap className="w-5 h-5 text-orange-500" />;
      case 'surprise_moment': return <Star className="w-5 h-5 text-yellow-500" />;
      default: return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBreakthroughTitle = (type: string) => {
    switch (type) {
      case 'honesty_surge': return 'Trust Breakthrough';
      case 'intimacy_peak': return 'Emotional Connection Peak';
      case 'attraction_spark': return 'Attraction Moment';
      case 'surprise_moment': return 'Surprise Discovery';
      default: return 'Significant Moment';
    }
  };

  const getPeakMoments = () => {
    return metrics.progression.peaks.map(peakIndex => {
      const response = getResponseForMoment(peakIndex);
      if (!response || !response.evaluation) return null;
      
      const overallScore = (
        response.evaluation.honesty + 
        response.evaluation.attraction + 
        response.evaluation.intimacy + 
        response.evaluation.surprise
      ) / 4;
      
      return {
        index: peakIndex,
        response,
        score: overallScore,
        dominantPillar: Object.entries(response.evaluation).reduce((a, b) => 
          response.evaluation![a[0] as keyof typeof response.evaluation] > response.evaluation![b[0] as keyof typeof response.evaluation] ? a : b
        )[0]
      };
    }).filter(Boolean);
  };

  const formatResponseTime = (time: number) => {
    if (time < 60) return `${time}s`;
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getContextualInsight = (response: GameResponse, type?: string) => {
    if (!response.evaluation) return '';
    
    const eval_data = response.evaluation;
    const responseTime = response.responseTime || 0;
    
    // Generate contextual insights based on evaluation patterns
    if (eval_data.honesty >= 4.5 && eval_data.intimacy >= 4.0) {
      return `Exceptional vulnerability moment - authentic sharing with deep emotional connection. ${responseTime < 30 ? 'Quick response suggests natural comfort.' : 'Thoughtful response shows careful consideration.'}`;
    }
    
    if (eval_data.attraction >= 4.5 && eval_data.surprise >= 4.0) {
      return `Strong attraction spike with surprise element - discovering something unexpectedly appealing. ${responseTime < 45 ? 'Immediate reaction indicates genuine surprise.' : 'Delayed response suggests processing complex feelings.'}`;
    }
    
    if (eval_data.intimacy >= 4.5) {
      return `Deep emotional revelation - sharing something personally significant. This level of openness indicates growing trust and connection.`;
    }
    
    if (eval_data.surprise >= 4.5) {
      return `Unexpected discovery moment - learning something new that challenges assumptions or reveals hidden depths.`;
    }
    
    return `Meaningful interaction with balanced emotional engagement across multiple dimensions.`;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Quote className="w-3 h-3 text-white" />
          </div>
          Specific Moment Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-powered analysis of your most significant conversation moments with actual response context
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Category Selection */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={selectedCategory === 'breakthroughs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('breakthroughs')}
            className="gap-2"
          >
            <Star className="w-4 h-4" />
            Breakthroughs ({metrics.highlights.breakthroughMoments.length})
          </Button>
          <Button
            variant={selectedCategory === 'peaks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('peaks')}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Peak Moments ({metrics.progression.peaks.length})
          </Button>
          <Button
            variant={selectedCategory === 'patterns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('patterns')}
            className="gap-2"
          >
            <Target className="w-4 h-4" />
            Patterns ({metrics.highlights.patterns.length})
          </Button>
        </div>

        {/* Breakthrough Moments */}
        {selectedCategory === 'breakthroughs' && (
          <div className="space-y-4">
            {metrics.highlights.breakthroughMoments.length === 0 ? (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    No breakthrough moments detected in this session. Breakthroughs occur when responses show significant emotional shifts or peaks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              metrics.highlights.breakthroughMoments.map((breakthrough, index) => {
                const response = getResponseForMoment(breakthrough.questionIndex);
                if (!response) return null;
                
                return (
                  <Card key={index} className="border-l-4 border-l-primary bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {getBreakthroughIcon(breakthrough.type)}
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-primary">
                                {getBreakthroughTitle(breakthrough.type)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Question {breakthrough.questionIndex + 1} • Significance: {(breakthrough.significance * 100).toFixed(0)}%
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`${getScoreColor(breakthrough.significance * 5)} border-0`}
                            >
                              {(breakthrough.significance * 5).toFixed(1)}/5.0
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-900">
                              "{response.question}"
                            </div>
                            
                            <Card className="border border-blue-200 bg-blue-50">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">Response</span>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatResponseTime(response.responseTime || 0)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-blue-800 italic">
                                  "{response.response}"
                                </p>
                              </CardContent>
                            </Card>
                            
                            {response.evaluation && (
                              <div className="grid grid-cols-4 gap-2 p-2 bg-white rounded border border-gray-200">
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">Honesty</div>
                                  <div className="font-semibold text-blue-600">{response.evaluation.honesty}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">Attraction</div>
                                  <div className="font-semibold text-orange-600">{response.evaluation.attraction}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">Intimacy</div>
                                  <div className="font-semibold text-red-600">{response.evaluation.intimacy}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">Surprise</div>
                                  <div className="font-semibold text-yellow-600">{response.evaluation.surprise}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-3 rounded border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-primary mb-1">AI Analysis</div>
                                <p className="text-sm text-gray-700">
                                  {getContextualInsight(response, breakthrough.type)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Peak Moments */}
        {selectedCategory === 'peaks' && (
          <div className="space-y-4">
            {getPeakMoments().length === 0 ? (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    No peak moments identified. Peaks are responses with the highest overall emotional engagement scores.
                  </p>
                </CardContent>
              </Card>
            ) : (
              getPeakMoments().map((peak, index) => {
                if (!peak) return null;
                
                return (
                  <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-yellow-800">
                                Peak Emotional Engagement
                              </div>
                              <div className="text-sm text-yellow-700">
                                Question {peak.index + 1} • Dominant: {peak.dominantPillar}
                              </div>
                            </div>
                            <Badge className="bg-yellow-500 text-white">
                              {peak.score.toFixed(1)}/5.0
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-900">
                              "{peak.response.question}"
                            </div>
                            
                            <Card className="border border-yellow-200 bg-yellow-100">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-yellow-700" />
                                  <span className="text-sm font-medium text-yellow-800">Peak Response</span>
                                </div>
                                <p className="text-sm text-yellow-800 italic">
                                  "{peak.response.response}"
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded border border-yellow-200">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-yellow-800 mb-1">Peak Analysis</div>
                                <p className="text-sm text-yellow-800">
                                  This represents your highest emotional engagement moment. The combination of high scores suggests optimal vulnerability and connection. Consider what made this interaction particularly meaningful.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Communication Patterns */}
        {selectedCategory === 'patterns' && (
          <div className="space-y-4">
            {metrics.highlights.patterns.length === 0 ? (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    No significant patterns detected. Patterns emerge from correlations and consistency in your responses.
                  </p>
                </CardContent>
              </Card>
            ) : (
              metrics.highlights.patterns.map((pattern, index) => (
                <Card key={index} className="border-l-4 border-l-green-500 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-green-800 capitalize">
                            {pattern.type.replace('_', ' ')}
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            {(pattern.strength * 100).toFixed(0)}% strength
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-green-700 mb-3">
                          {pattern.description}
                        </p>
                        
                        <div className="bg-green-100 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-green-800 mb-1">Pattern Insight</div>
                              <p className="text-sm text-green-700">
                                {pattern.type === 'communication_flow' && 
                                  'Your honest moments align well with intimate sharing, suggesting healthy emotional safety and trust-building.'}
                                {pattern.type === 'vulnerability_cycle' && 
                                  'You maintain consistent emotional responses, indicating stable vulnerability patterns and emotional regulation.'}
                                {pattern.type === 'excitement_rhythm' && 
                                  'Your attraction and surprise responses sync well, showing aligned excitement and discovery patterns.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
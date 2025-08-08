import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Star, Heart, Brain, Zap } from 'lucide-react';
import { RoomAnalyticsData, RoomQuestionItem } from '@/hooks/useRoomAnalytics';

interface QuestionInsightsProps {
  analytics: RoomAnalyticsData | null;
}

const getInsightIcon = (type: string) => {
  const icons = {
    'strongest': Star,
    'improvement': Target,
    'breakthrough': TrendingUp,
    'surprise': Zap
  };
  return icons[type as keyof typeof icons] || Star;
};

const calculateQuestionScore = (item: RoomQuestionItem) => {
  if (!item.evaluation) return 0;
  const { honesty = 0, attraction = 0, intimacy = 0, surprise = 0 } = item.evaluation;
  return (honesty + attraction + intimacy + surprise) / 4;
};

const getComparisonText = (sessionValue: number, globalValue: number | undefined) => {
  if (!globalValue) return { text: 'No global data', color: 'text-muted-foreground' };
  
  const diff = sessionValue - globalValue;
  const percentage = Math.abs((diff / globalValue) * 100);
  
  if (percentage < 5) {
    return { text: 'Similar to average', color: 'text-muted-foreground' };
  } else if (diff > 0) {
    return { 
      text: `${percentage.toFixed(0)}% above average`, 
      color: 'text-emerald-600',
      icon: TrendingUp
    };
  } else {
    return { 
      text: `${percentage.toFixed(0)}% below average`, 
      color: 'text-orange-600',
      icon: TrendingDown
    };
  }
};

export const QuestionInsights: React.FC<QuestionInsightsProps> = ({ analytics }) => {
  if (!analytics || analytics.items.length === 0) return null;

  const { items, globalQuestionStats } = analytics;
  
  // Find the most significant questions
  const scoredItems = items
    .map(item => ({
      ...item,
      totalScore: calculateQuestionScore(item),
      globalScore: ((globalQuestionStats[item.questionId]?.honesty || 0) + 
                   (globalQuestionStats[item.questionId]?.attraction || 0) + 
                   (globalQuestionStats[item.questionId]?.intimacy || 0) + 
                   (globalQuestionStats[item.questionId]?.surprise || 0)) / 4
    }))
    .filter(item => item.evaluation) // Only include items with evaluations
    .sort((a, b) => b.totalScore - a.totalScore);

  // Select top 3-4 most interesting questions
  const significantQuestions = scoredItems.slice(0, 4);
  
  const generateInsights = () => {
    const insights = [];
    
    // Strongest response
    if (significantQuestions.length > 0) {
      const strongest = significantQuestions[0];
      insights.push({
        type: 'strongest',
        title: 'Your Strongest Connection',
        question: strongest.questionText,
        score: strongest.totalScore,
        globalScore: strongest.globalScore,
        description: `This question sparked your highest connection intensity with a score of ${strongest.totalScore.toFixed(1)}/5.`
      });
    }
    
    // Biggest surprise (highest surprise score)
    const surpriseQuestion = scoredItems
      .filter(item => item.evaluation?.surprise && item.evaluation.surprise >= 4)
      .sort((a, b) => (b.evaluation?.surprise || 0) - (a.evaluation?.surprise || 0))[0];
    
    if (surpriseQuestion && surpriseQuestion.evaluation) {
      insights.push({
        type: 'surprise',
        title: 'Most Surprising Moment',
        question: surpriseQuestion.questionText,
        score: surpriseQuestion.evaluation.surprise || 0,
        globalScore: globalQuestionStats[surpriseQuestion.questionId]?.surprise,
        description: `Your partner was most surprised by this response, rating it ${surpriseQuestion.evaluation.surprise || 0}/5 for surprise.`
      });
    }
    
    // Area for improvement (lowest scores but with global comparison)
    const improvementArea = scoredItems
      .filter(item => item.totalScore < 3.5)
      .sort((a, b) => a.totalScore - b.totalScore)[0];
    
    if (improvementArea) {
      insights.push({
        type: 'improvement',
        title: 'Growth Opportunity',
        question: improvementArea.questionText,
        score: improvementArea.totalScore,
        globalScore: improvementArea.globalScore,
        description: `This area shows potential for deeper connection with more open sharing.`
      });
    }
    
    return insights.slice(0, 3); // Max 3 insights
  };

  const insights = generateInsights();

  return (
    <Card className="mb-12">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Key Question Insights
        </CardTitle>
        <p className="text-muted-foreground">
          Your most impactful moments compared to couples worldwide
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {insights.map((insight, index) => {
            const InsightIcon = getInsightIcon(insight.type);
            const comparison = getComparisonText(insight.score || 0, insight.globalScore);
            const ComparisonIcon = comparison.icon;
            
            return (
              <div 
                key={index}
                className="bg-gradient-to-r from-background to-primary/5 p-6 rounded-xl border border-primary/10 hover-scale transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${
                    insight.type === 'strongest' ? 'bg-emerald-100 text-emerald-600' :
                    insight.type === 'surprise' ? 'bg-orange-100 text-orange-600' :
                    insight.type === 'improvement' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <InsightIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{insight.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {(insight.score || 0).toFixed(1)}/5
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                      {insight.description}
                    </p>
                    
                    <div className="bg-muted/30 p-3 rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground italic line-clamp-2">
                        "{insight.question}"
                      </p>
                    </div>
                    
                    {/* Score visualization */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Your Connection Intensity</span>
                          <span className="text-sm text-muted-foreground">{(insight.score || 0).toFixed(1)}/5</span>
                        </div>
                        <Progress 
                          value={((insight.score || 0) / 5) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      {insight.globalScore && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Global Average</span>
                            <span className="text-sm text-muted-foreground">{insight.globalScore.toFixed(1)}/5</span>
                          </div>
                          <Progress 
                            value={(insight.globalScore / 5) * 100} 
                            className="h-2 opacity-50"
                          />
                        </div>
                      )}
                      
                      {/* Comparison */}
                      <div className={`flex items-center gap-2 text-sm ${comparison.color}`}>
                        {ComparisonIcon && <ComparisonIcon className="w-4 h-4" />}
                        <span>{comparison.text}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {analytics.sessionAverages.honesty?.toFixed(1) || '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                <Brain className="w-3 h-3" />
                Honesty
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {analytics.sessionAverages.attraction?.toFixed(1) || '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                <Heart className="w-3 h-3" />
                Attraction
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {analytics.sessionAverages.intimacy?.toFixed(1) || '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                Intimacy
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {analytics.sessionAverages.surprise?.toFixed(1) || '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                <Star className="w-3 h-3" />
                Surprise
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
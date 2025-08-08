import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Brain, 
  Target, 
  Zap,
  Gauge,
  Timer
} from 'lucide-react';
import { useAdvancedInsights } from '@/hooks/useAdvancedInsights';

interface ResponseTimeAnalyticsProps {
  roomCode: string;
}

export const ResponseTimeAnalytics: React.FC<ResponseTimeAnalyticsProps> = ({ roomCode }) => {
  const { data: advancedInsights } = useAdvancedInsights(roomCode);

  if (!advancedInsights) return null;

  const { responseTimeAnalytics } = advancedInsights;

  const formatTime = (milliseconds: number) => {
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSpeedBadge = (userAverage: number, globalMedian: number) => {
    const ratio = userAverage / globalMedian;
    if (ratio < 0.7) return { label: 'Lightning Fast', color: 'bg-yellow-500', icon: Zap };
    if (ratio < 0.9) return { label: 'Quick Thinker', color: 'bg-blue-500', icon: Gauge };
    if (ratio < 1.1) return { label: 'Steady Pace', color: 'bg-green-500', icon: Target };
    if (ratio < 1.3) return { label: 'Thoughtful', color: 'bg-purple-500', icon: Brain };
    return { label: 'Deep Processor', color: 'bg-indigo-500', icon: Clock };
  };

  const speedBadge = getSpeedBadge(responseTimeAnalytics.userAverage, responseTimeAnalytics.globalMedian);
  const SpeedIcon = speedBadge.icon;

  const getMindfulnessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getThoughtfulnessColor = (score: number) => {
    if (score >= 80) return 'text-purple-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Timer className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Response Time Analytics</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Understanding your thinking patterns and response authenticity
        </p>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Average Response Time */}
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-1 ${speedBadge.color}`} />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <SpeedIcon className="w-5 h-5" />
              Your Average Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatTime(responseTimeAnalytics.userAverage)}
              </div>
              <Badge className={`mt-2 ${speedBadge.color} text-white`}>
                {speedBadge.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Global Median</span>
                <span>{formatTime(responseTimeAnalytics.globalMedian)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Percentile</span>
                <span className="font-medium">{responseTimeAnalytics.percentile}th</span>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Based on {Math.max(1, Math.round((responseTimeAnalytics as any).globalSampleSize || 0))} global responses
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mindfulness Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Mindfulness Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getMindfulnessColor(responseTimeAnalytics.mindfulnessScore)}`}>
                {Math.round(responseTimeAnalytics.mindfulnessScore)}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <Progress 
              value={responseTimeAnalytics.mindfulnessScore} 
              className="h-3"
            />
            <div className="text-xs text-muted-foreground text-center">
              {responseTimeAnalytics.mindfulnessScore >= 80 ? 
                'Excellent balance of speed and reflection' :
                responseTimeAnalytics.mindfulnessScore >= 60 ?
                'Good thoughtfulness in responses' :
                'Consider taking more time to reflect'
              }
            </div>
          </CardContent>
        </Card>

        {/* Thoughtfulness Index */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Thoughtfulness Index
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getThoughtfulnessColor(responseTimeAnalytics.thoughtfulnessIndex)}`}>
                {Math.round(responseTimeAnalytics.thoughtfulnessIndex)}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <Progress 
              value={responseTimeAnalytics.thoughtfulnessIndex} 
              className="h-3"
            />
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Optimal:</span>
                <span>
                  {formatTime(responseTimeAnalytics.optimalRange[0])} - {formatTime(responseTimeAnalytics.optimalRange[1])}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consistency Analysis */}
      <Card className="bg-gradient-to-br from-accent/5 to-muted/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-accent" />
            Response Consistency Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Consistency Score</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(responseTimeAnalytics.consistency)}%
                  </span>
                </div>
                <Progress value={responseTimeAnalytics.consistency} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {responseTimeAnalytics.consistency >= 80 ? 
                  'Very consistent response timing' :
                  responseTimeAnalytics.consistency >= 60 ?
                  'Moderately consistent responses' :
                  'Response times vary significantly'
                }
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Response Pattern Insights</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {responseTimeAnalytics.userAverage < responseTimeAnalytics.globalMedian ? 
                      'Faster than average - intuitive responses' :
                      'Slower than average - thoughtful processing'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-muted-foreground">
                    {responseTimeAnalytics.consistency >= 70 ? 
                      'Consistent thinking style' :
                      'Variable processing depending on question'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-muted-foreground">
                    {responseTimeAnalytics.thoughtfulnessIndex >= 75 ? 
                      'Optimal balance of speed and depth' :
                      'Room for timing optimization'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
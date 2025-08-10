import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Heart, Zap } from 'lucide-react';

interface BreakthroughMomentsTimelineProps {
  analytics?: any;
  insights: any;
}

export const BreakthroughMomentsTimeline: React.FC<BreakthroughMomentsTimelineProps> = ({ 
  analytics, 
  insights 
}) => {
  const pillars = insights.pillars || {};
  
  // Generate breakthrough moments based on pillar scores
  const generateBreakthroughMoments = () => {
    const moments = [];
    
    if ((pillars.honesty || 0) > 3.5) {
      moments.push({
        type: 'Honesty Breakthrough',
        icon: <Heart className="w-4 h-4" />,
        score: pillars.honesty,
        description: 'A moment of radical truth-telling that deepened your connection',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        insight: 'This moment of vulnerability created a foundation of emotional safety'
      });
    }

    if ((pillars.intimacy || 0) > 3.5) {
      moments.push({
        type: 'Intimacy Revelation',
        icon: <Sparkles className="w-4 h-4" />,
        score: pillars.intimacy,
        description: 'Deep personal sharing that brought you closer together',
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        insight: 'This sharing expanded your emotional world and understanding of each other'
      });
    }

    if ((pillars.attraction || 0) > 3.5) {
      moments.push({
        type: 'Spark Ignition',
        icon: <Zap className="w-4 h-4" />,
        score: pillars.attraction,
        description: 'A moment that reignited passion and desire',
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800',
        insight: 'This moment reminded you both of your magnetic attraction'
      });
    }

    if ((pillars.surprise || 0) > 3.5) {
      moments.push({
        type: 'Discovery Peak',
        icon: <TrendingUp className="w-4 h-4" />,
        score: pillars.surprise,
        description: 'An unexpected revelation that surprised you both',
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-200 dark:border-green-800',
        insight: 'This discovery added new dimensions to how you see each other'
      });
    }

    return moments.sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const breakthroughMoments = generateBreakthroughMoments();

  if (breakthroughMoments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Breakthrough Moments Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Your journey is building momentum. Breakthrough moments emerge as connection deepens.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Breakthrough Moments Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Key moments that created significant shifts in your relationship dynamic
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {breakthroughMoments.map((moment, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border-l-4 ${moment.bgColor} ${moment.borderColor}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 ${moment.color}`}>
                  {moment.icon}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{moment.type}</h3>
                    <Badge variant="outline" className="text-xs">
                      Impact: {((moment.score || 0) * 20).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {moment.description}
                  </p>
                  <div className={`text-xs p-2 rounded ${moment.bgColor} border ${moment.borderColor}`}>
                    <strong>Psychological Insight:</strong> {moment.insight}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Pattern Analysis */}
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Pattern Recognition
          </h3>
          <p className="text-sm text-muted-foreground">
            Your breakthrough moments show a pattern of{' '}
            {breakthroughMoments.length >= 3 ? 'accelerated intimacy development' : 
             breakthroughMoments.length >= 2 ? 'steady connection building' : 
             'foundational trust establishment'}. This indicates{' '}
            {breakthroughMoments.length >= 3 ? 'high emotional intelligence and readiness for deep connection' :
             breakthroughMoments.length >= 2 ? 'healthy relationship progression and emotional safety' :
             'a strong foundation being built for future intimacy growth'}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
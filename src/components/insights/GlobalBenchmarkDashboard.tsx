import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Globe, Target, Award, BarChart3, Heart, Zap } from 'lucide-react';
import { useInsightsBenchmarks } from '@/hooks/useInsightsBenchmarks';
import { useGlobalInsights } from '@/hooks/useGlobalInsights';

interface GlobalBenchmarkDashboardProps {
  insights: any;
  roomCode: string;
}

export const GlobalBenchmarkDashboard: React.FC<GlobalBenchmarkDashboardProps> = ({ 
  insights, 
  roomCode 
}) => {
  const { data: benchmarks } = useInsightsBenchmarks();
  const { data: globalData } = useGlobalInsights();
  
  const pillars = insights.pillars || {};
  const compatibilityScore = insights.overall_compatibility || 0;

  const calculatePercentile = (score: number, globalAvg: number) => {
    const percentile = Math.min(100, Math.max(0, ((score - globalAvg) / globalAvg) * 50 + 50));
    return Math.round(percentile);
  };

  const getPerformanceLevel = (percentile: number) => {
    if (percentile >= 90) return { level: 'Elite', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20' };
    if (percentile >= 75) return { level: 'High Performer', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' };
    if (percentile >= 50) return { level: 'Above Average', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20' };
    if (percentile >= 25) return { level: 'Developing', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20' };
    return { level: 'Building', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/20' };
  };

  if (!benchmarks || !globalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Global Benchmark Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading global comparison data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const compatibilityPercentile = calculatePercentile(
    compatibilityScore, 
    globalData.globalCompatibilityAvg || 50
  );
  const performanceLevel = getPerformanceLevel(compatibilityPercentile);

  const benchmarkMetrics = [
    {
      name: 'Honesty',
      userScore: pillars.honesty || 0,
      globalAvg: globalData.pillarAverages?.honesty || 3.0,
      icon: <Target className="w-4 h-4" />
    },
    {
      name: 'Intimacy',
      userScore: pillars.intimacy || 0,
      globalAvg: globalData.pillarAverages?.intimacy || 3.0,
      icon: <Heart className="w-4 h-4" />
    },
    {
      name: 'Attraction',
      userScore: pillars.attraction || 0,
      globalAvg: globalData.pillarAverages?.attraction || 3.0,
      icon: <Zap className="w-4 h-4" />
    },
    {
      name: 'Surprise',
      userScore: pillars.surprise || 0,
      globalAvg: globalData.pillarAverages?.surprise || 3.0,
      icon: <TrendingUp className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Global Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`p-4 rounded-lg ${performanceLevel.bg} border`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-muted-foreground">Your Performance Level</div>
                <div className={`text-2xl font-bold ${performanceLevel.color}`}>
                  {performanceLevel.level}
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {compatibilityPercentile}th Percentile
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Your compatibility score of {compatibilityScore}% places you in the top{' '}
              {100 - compatibilityPercentile}% of all couples globally.
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background border rounded-lg">
              <div className="text-2xl font-bold text-primary">{globalData.sessionsCount || 0}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center p-3 bg-background border rounded-lg">
              <div className="text-2xl font-bold text-primary">{globalData.globalCompatibilityAvg?.toFixed(0) || 0}%</div>
              <div className="text-xs text-muted-foreground">Global Average</div>
            </div>
            <div className="text-center p-3 bg-background border rounded-lg">
              <div className="text-2xl font-bold text-primary">{globalData.responseTimeMedian || 0}s</div>
              <div className="text-xs text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-center p-3 bg-background border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Object.keys(globalData.phaseDistribution || {}).length}
              </div>
              <div className="text-xs text-muted-foreground">Relationship Phases</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Pillar-by-Pillar Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {benchmarkMetrics.map((metric, index) => {
            const percentile = calculatePercentile(metric.userScore, metric.globalAvg);
            const delta = metric.userScore - metric.globalAvg;
            const deltaPercent = ((delta / metric.globalAvg) * 100);
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-primary">{metric.icon}</div>
                    <span className="font-medium">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {percentile}th percentile
                    </Badge>
                    <Badge 
                      variant={delta > 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {delta > 0 ? '+' : ''}{deltaPercent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={percentile} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground min-w-0">
                    {metric.userScore.toFixed(1)} vs {metric.globalAvg.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Population Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Population Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-background border rounded-lg">
              <h3 className="font-medium mb-2">Couple Type Distribution</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(globalData.phaseDistribution || {}).map(([phase, count]) => (
                  <div key={phase} className="flex justify-between">
                    <span className="capitalize">{phase.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{String(count)}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-background border rounded-lg">
              <h3 className="font-medium mb-2">Success Patterns</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• High-performing couples show consistent honesty scores above 4.0</div>
                <div>• Strong attraction + intimacy correlation predicts long-term success</div>
                <div>• Surprise factor above 3.5 indicates healthy relationship novelty</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
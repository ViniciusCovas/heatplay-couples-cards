import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useInsightsBenchmarks } from '@/hooks/useInsightsBenchmarks';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface GlobalContextOverviewProps {
  insights: ConnectionInsightsData;
}

export const GlobalContextOverview: React.FC<GlobalContextOverviewProps> = ({ insights }) => {
  const { data: benchmarks } = useInsightsBenchmarks();
  if (!benchmarks) return null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Global Context Overview</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Where this session sits relative to anonymized global patterns (non-competitive)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Compatibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-primary">{insights.compatibilityScore}%</span>
              <span className="text-sm text-muted-foreground">Session score</span>
            </div>
            <Progress value={insights.compatibilityScore} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold">{benchmarks.globalAverage}%</span>
              <span className="text-sm text-muted-foreground">Across sessions</span>
            </div>
            <Progress value={benchmarks.globalAverage} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold">{benchmarks.phaseAverage}%</span>
              <span className="text-sm text-muted-foreground capitalize">{insights.relationshipPhase} phase</span>
            </div>
            <Progress value={benchmarks.phaseAverage} className="h-3" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

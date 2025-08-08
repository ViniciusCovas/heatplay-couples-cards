import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { BenchmarkData } from '@/hooks/useInsightsBenchmarks';

interface BenchmarkLeaderboardProps {
  insights: ConnectionInsightsData;
  benchmarks?: BenchmarkData;
}

// NOTE: This component has been simplified to a neutral, non-competitive global context.
export const BenchmarkLeaderboard = ({ insights, benchmarks }: BenchmarkLeaderboardProps) => {
  if (!benchmarks) return null;

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Global Context Overview
        </h2>
        <p className="text-muted-foreground">
          Non-competitive perspective on how this session sits among others
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-to-br from-white to-secondary/5 border-secondary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Comparison Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Your score vs others */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Your Compatibility</span>
                <span className="text-sm font-bold text-primary">{insights.compatibilityScore}%</span>
              </div>
              <Progress value={insights.compatibilityScore} className="h-3 bg-gray-200" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Phase Average</span>
                <span className="text-sm font-medium">{benchmarks.phaseAverage}%</span>
              </div>
              <Progress value={benchmarks.phaseAverage} className="h-3 bg-gray-200" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Global Average</span>
                <span className="text-sm font-medium">{benchmarks.globalAverage}%</span>
              </div>
              <Progress value={benchmarks.globalAverage} className="h-3 bg-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

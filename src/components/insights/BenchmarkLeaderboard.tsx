import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { BenchmarkData } from '@/hooks/useInsightsBenchmarks';

interface BenchmarkLeaderboardProps {
  insights: ConnectionInsightsData;
  benchmarks?: BenchmarkData;
}

export const BenchmarkLeaderboard = ({ insights, benchmarks }: BenchmarkLeaderboardProps) => {
  if (!benchmarks) return null;

  const yourPercentile = Math.round((insights.compatibilityScore / 100) * 100);
  const getRankIcon = (percentile: number) => {
    if (percentile >= 90) return { icon: Trophy, color: 'text-yellow-500', bg: 'from-yellow-400 to-yellow-600' };
    if (percentile >= 75) return { icon: Medal, color: 'text-gray-400', bg: 'from-gray-400 to-gray-600' };
    return { icon: Award, color: 'text-amber-600', bg: 'from-amber-500 to-amber-700' };
  };

  const rank = getRankIcon(benchmarks.percentile);
  const RankIcon = rank.icon;

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Global Relationship Leaderboard
        </h2>
        <p className="text-muted-foreground">
          See how your connection ranks among couples worldwide
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Podium Card */}
        <Card className="bg-gradient-to-br from-white to-accent/5 border-accent/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Your Global Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Podium visualization */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-end gap-2 mb-4">
                {/* Second place */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mb-2">
                    <Medal className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-lg flex items-end justify-center pb-2">
                    <span className="text-white font-bold text-sm">75th</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">Good</span>
                </div>

                {/* First place (Your position) */}
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${rank.bg} rounded-full flex items-center justify-center mb-2 relative`}>
                    <RankIcon className="w-8 h-8 text-white" />
                    {benchmarks.percentile >= 90 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-t from-primary to-accent rounded-t-lg flex items-end justify-center pb-2 relative">
                    <span className="text-white font-bold">{benchmarks.percentile}th</span>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-yellow-400 animate-bounce">
                      ⭐
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="mt-1 bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 text-xs"
                  >
                    You!
                  </Badge>
                </div>

                {/* Third place */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center mb-2">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-16 h-12 bg-gradient-to-t from-amber-400 to-amber-500 rounded-t-lg flex items-end justify-center pb-2">
                    <span className="text-white font-bold text-sm">50th</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">Average</span>
                </div>
              </div>

              <div className="text-lg font-semibold text-foreground mb-2">
                Outstanding Performance! 🎉
              </div>
              <p className="text-sm text-muted-foreground">
                You're performing better than {benchmarks.percentile}% of couples globally
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Stats */}
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

            {/* Performance badges */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Performance Badges</h4>
              <div className="flex flex-wrap gap-2">
                {insights.compatibilityScore >= benchmarks.globalAverage + 20 && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                    🚀 High Achiever
                  </Badge>
                )}
                {benchmarks.percentile >= 75 && (
                  <Badge className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    🏆 Top Performer
                  </Badge>
                )}
                {insights.strengthAreas && insights.strengthAreas.length >= 3 && (
                  <Badge className="bg-gradient-to-r from-green-400 to-green-600 text-white">
                    💪 Well-Rounded
                  </Badge>
                )}
                <Badge className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
                  ⭐ {insights.relationshipPhase} Expert
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
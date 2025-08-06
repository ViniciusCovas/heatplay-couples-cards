import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Crown,
  Medal,
  Trophy,
  Award
} from 'lucide-react';
import { useAdvancedInsights } from '@/hooks/useAdvancedInsights';

interface PeerComparisonDashboardProps {
  roomCode: string;
}

export const PeerComparisonDashboard: React.FC<PeerComparisonDashboardProps> = ({ roomCode }) => {
  const { data: advancedInsights } = useAdvancedInsights(roomCode);

  if (!advancedInsights) return null;

  const { peerComparisons } = advancedInsights;

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Top 10%': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'Top 25%': return <Trophy className="w-4 h-4 text-orange-500" />;
      case 'Above Average': return <Medal className="w-4 h-4 text-blue-500" />;
      default: return <Award className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Top 10%': return 'bg-gradient-to-r from-yellow-500 to-amber-500';
      case 'Top 25%': return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'Above Average': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'Average': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const formatDimension = (dimension: string) => {
    return dimension.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Peer Comparison</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See how your connection compares with other couples worldwide
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {peerComparisons.map((comparison, index) => (
          <Card key={comparison.dimension} className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 left-0 right-0 h-1 ${getRankColor(comparison.rank)}`} />
            
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {formatDimension(comparison.dimension)}
                </CardTitle>
                {getRankIcon(comparison.rank)}
              </div>
              <Badge variant="secondary" className="w-fit">
                {comparison.rank}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Score Comparison */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Score</span>
                  <span className="font-bold text-primary">{comparison.userScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Peer Average</span>
                  <span className="font-medium">{comparison.peerAverage.toFixed(1)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={(comparison.userScore / 5) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {comparison.percentile}th percentile
                </div>
              </div>

              {/* Performance Badge */}
              <div className="flex justify-center">
                <Badge 
                  variant={comparison.userScore > comparison.peerAverage ? "default" : "secondary"}
                  className={`${comparison.userScore > comparison.peerAverage ? getRankColor(comparison.rank) : ''}`}
                >
                  {comparison.userScore > comparison.peerAverage ? (
                    <>
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Above Average
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3 mr-1" />
                      Growth Area
                    </>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Overall Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {peerComparisons.filter(c => c.userScore > c.peerAverage).length}
              </div>
              <div className="text-sm text-muted-foreground">Above Average</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-secondary">
                {peerComparisons.filter(c => c.rank.includes('Top')).length}
              </div>
              <div className="text-sm text-muted-foreground">Top Tier</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-accent">
                {Math.round(peerComparisons.reduce((sum, c) => sum + c.percentile, 0) / peerComparisons.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Percentile</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {peerComparisons.length}
              </div>
              <div className="text-sm text-muted-foreground">Dimensions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
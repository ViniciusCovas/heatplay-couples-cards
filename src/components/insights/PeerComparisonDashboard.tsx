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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Context with Other Couples</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Neutral comparison of your session against anonymized global patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {peerComparisons.map((comparison) => (
          <Card key={comparison.dimension} className="relative overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {formatDimension(comparison.dimension)}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Percentile: {comparison.percentile}th
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Session Score</span>
                  <span className="font-bold text-primary">{comparison.userScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Global Average</span>
                  <span className="font-medium">{comparison.peerAverage.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Progress 
                  value={(comparison.userScore / 5) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  Neutral context: higher is better for this dimension
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {peerComparisons.length}
              </div>
              <div className="text-sm text-muted-foreground">Compared Dimensions</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-secondary">
                {Math.round(peerComparisons.reduce((sum, c) => sum + c.userScore, 0) / Math.max(peerComparisons.length, 1) * 10) / 10}
              </div>
              <div className="text-sm text-muted-foreground">Avg Session Score</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-accent">
                {Math.round(peerComparisons.reduce((sum, c) => sum + (c.userScore > c.peerAverage ? 1 : 0), 0) / Math.max(peerComparisons.length, 1) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Above Global Avg</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {Math.round(peerComparisons.reduce((sum, c) => sum + c.percentile, 0) / Math.max(peerComparisons.length, 1))}th
              </div>
              <div className="text-sm text-muted-foreground">Avg Percentile</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
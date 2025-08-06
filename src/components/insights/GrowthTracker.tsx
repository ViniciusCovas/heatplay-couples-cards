import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import { useAdvancedInsights } from '@/hooks/useAdvancedInsights';

interface GrowthTrackerProps {
  roomCode: string;
}

export const GrowthTracker: React.FC<GrowthTrackerProps> = ({ roomCode }) => {
  const { data: advancedInsights } = useAdvancedInsights(roomCode);

  if (!advancedInsights) return null;

  const { growthMetrics, totalSessions, streakDays } = advancedInsights;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Target className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-100';
      case 'declining': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getVelocityColor = (velocity: number) => {
    if (velocity >= 80) return 'text-green-600';
    if (velocity >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPlateauRiskColor = (risk: number) => {
    if (risk >= 50) return 'text-red-600';
    if (risk >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Growth Tracker</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Monitor your relationship development and identify growth opportunities
        </p>
      </div>

      {/* Growth Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Velocity Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-primary" />
              Growth Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getVelocityColor(growthMetrics.velocityScore)}`}>
                {Math.round(growthMetrics.velocityScore)}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <Progress value={growthMetrics.velocityScore} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {growthMetrics.velocityScore >= 80 ? 'Rapid growth trajectory' :
               growthMetrics.velocityScore >= 60 ? 'Steady improvement' :
               'Focus needed for growth'}
            </div>
          </CardContent>
        </Card>

        {/* Current Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getTrendIcon(growthMetrics.trend)}
              Current Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <Badge className={getTrendColor(growthMetrics.trend)}>
                {growthMetrics.trend.charAt(0).toUpperCase() + growthMetrics.trend.slice(1)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {growthMetrics.trend === 'improving' ? 'Great momentum!' :
               growthMetrics.trend === 'declining' ? 'Time to refocus' :
               'Maintaining current level'}
            </div>
          </CardContent>
        </Card>

        {/* Breakthrough Moments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-secondary" />
              Breakthroughs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {growthMetrics.breakthroughMoments}
              </div>
              <div className="text-sm text-muted-foreground">this session</div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {growthMetrics.breakthroughMoments > 0 ? 
                'Significant progress detected!' :
                'Continue building for breakthroughs'}
            </div>
          </CardContent>
        </Card>

        {/* Plateau Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Plateau Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPlateauRiskColor(growthMetrics.plateauRisk)}`}>
                {Math.round(growthMetrics.plateauRisk)}%
              </div>
              <div className="text-sm text-muted-foreground">risk level</div>
            </div>
            <Progress 
              value={growthMetrics.plateauRisk} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground text-center">
              {growthMetrics.plateauRisk >= 50 ? 'High - Mix up your approach' :
               growthMetrics.plateauRisk >= 30 ? 'Moderate - Stay engaged' :
               'Low - Great variety!'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Milestone */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Next Milestone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium text-lg">{growthMetrics.nextMilestone}</h3>
              <p className="text-sm text-muted-foreground">
                Focus on consistency and deeper exploration in your sessions
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-primary">
                {Math.round(100 - growthMetrics.plateauRisk)}%
              </div>
              <div className="text-sm text-muted-foreground">completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session History Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Session History Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-primary">{totalSessions}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
              <Badge variant="outline">
                {totalSessions >= 5 ? 'Experienced' : 'Getting Started'}
              </Badge>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-secondary">{streakDays}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
              <Badge variant="outline">
                {streakDays >= 7 ? 'Consistent' : streakDays >= 3 ? 'Building Habit' : 'Just Started'}
              </Badge>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-accent">
                {Math.round(growthMetrics.velocityScore)}
              </div>
              <div className="text-sm text-muted-foreground">Growth Rate</div>
              <Badge variant="outline">
                {growthMetrics.trend === 'improving' ? 'Accelerating' : 
                 growthMetrics.trend === 'stable' ? 'Steady' : 'Needs Focus'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
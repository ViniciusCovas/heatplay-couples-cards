import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PsychologicalMetrics, IntelligenceInsights } from '@/utils/psychologicalAnalysis';
import { 
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { 
  Brain, 
  MessageCircle, 
  Activity, 
  TrendingUp, 
  Target,
  Zap
} from 'lucide-react';

interface CommunicationDNARadarProps {
  metrics: PsychologicalMetrics;
  insights: IntelligenceInsights;
}

export const CommunicationDNARadar: React.FC<CommunicationDNARadarProps> = ({
  metrics,
  insights
}) => {
  const [activePoint, setActivePoint] = useState<string | null>(null);

  // Prepare radar chart data with multiple dimensions
  const radarData = [
    {
      dimension: 'Emotional\nIntimacy',
      currentSession: (metrics.bondMap.closeness / 5) * 100,
      stability: ((1 - metrics.volatility.intimacy / 2.5) * 100),
      correlation: Math.abs(metrics.correlations.honestyIntimacy * 100),
      fullMark: 100
    },
    {
      dimension: 'Trust &\nHonesty',
      currentSession: (metrics.bondMap.anchor / 5) * 100,
      stability: ((1 - metrics.volatility.honesty / 2.5) * 100),
      correlation: Math.abs(metrics.correlations.honestyIntimacy * 100),
      fullMark: 100
    },
    {
      dimension: 'Passion &\nAttraction',
      currentSession: (metrics.bondMap.spark / 5) * 100,
      stability: ((1 - metrics.volatility.attraction / 2.5) * 100),
      correlation: Math.abs(metrics.correlations.attractionSurprise * 100),
      fullMark: 100
    },
    {
      dimension: 'Novelty &\nSurprise',
      currentSession: (metrics.volatility.surprise / 2.5) * 100,
      stability: ((1 - metrics.volatility.surprise / 2.5) * 100),
      correlation: Math.abs(metrics.correlations.attractionSurprise * 100),
      fullMark: 100
    },
    {
      dimension: 'Communication\nFlow',
      currentSession: (metrics.correlations.overallStability * 100),
      stability: (metrics.progression.consistency * 100),
      correlation: ((metrics.correlations.honestyIntimacy + metrics.correlations.attractionSurprise) / 2) * 100,
      fullMark: 100
    },
    {
      dimension: 'Emotional\nStability',
      currentSession: ((1 - metrics.volatility.overall / 2.5) * 100),
      stability: (metrics.progression.consistency * 100),
      correlation: (metrics.correlations.overallStability * 100),
      fullMark: 100
    }
  ];

  const getDNAColor = (style: string) => {
    switch (style) {
      case 'Validating': return 'hsl(142, 76%, 36%)'; // Green
      case 'Adventurous': return 'hsl(25, 95%, 53%)'; // Orange
      case 'Deep': return 'hsl(221, 83%, 53%)'; // Blue
      case 'Playful': return 'hsl(280, 100%, 70%)'; // Purple
      case 'Balanced': return 'hsl(217, 91%, 60%)'; // Light Blue
      default: return 'hsl(var(--primary))';
    }
  };

  const getVelocityDescription = () => {
    const { speed, direction } = insights.relationshipVelocity;
    return {
      'Slow & Steady': 'Building a solid foundation with careful, thoughtful progression',
      'Moderate Pace': 'Healthy balanced growth with consistent momentum',
      'Fast Track': 'Rapid development with high engagement and quick breakthroughs',
      'Variable': 'Dynamic with alternating periods of intensity and reflection'
    }[speed] || 'Developing at your own unique pace';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="border border-primary/20 shadow-lg">
          <CardContent className="p-3">
            <div className="font-medium text-sm mb-2">{label}</div>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-2 text-xs">
                <span style={{ color: entry.color }}>{entry.dataKey}:</span>
                <span className="font-medium">{entry.value.toFixed(0)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-3 h-3 text-white" />
          </div>
          Communication DNA Analysis
        </CardTitle>
        <div className="flex items-center gap-4">
          <Badge 
            variant="secondary" 
            className="gap-1"
            style={{ 
              backgroundColor: `${getDNAColor(insights.communicationDNA.style)}20`,
              color: getDNAColor(insights.communicationDNA.style)
            }}
          >
            <MessageCircle className="w-3 h-3" />
            {insights.communicationDNA.style} Style
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Activity className="w-3 h-3" />
            {(insights.communicationDNA.strength * 100).toFixed(0)}% Strength
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.3}
                />
                <PolarAngleAxis 
                  dataKey="dimension" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  className="text-xs"
                />
                <PolarRadiusAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickCount={5}
                />
                
                {/* Current Session Data */}
                <Radar
                  name="Current Session"
                  dataKey="currentSession"
                  stroke={getDNAColor(insights.communicationDNA.style)}
                  fill={getDNAColor(insights.communicationDNA.style)}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                
                {/* Stability Overlay */}
                <Radar
                  name="Stability"
                  dataKey="stability"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />
                
                {/* Correlation Pattern */}
                <Radar
                  name="Correlation"
                  dataKey="correlation"
                  stroke="hsl(var(--accent))"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="3,3"
                />
                
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconSize={8}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* DNA Analysis Details */}
          <div className="space-y-4">
            {/* Communication Style Card */}
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle 
                    className="w-5 h-5" 
                    style={{ color: getDNAColor(insights.communicationDNA.style) }}
                  />
                  <span className="font-semibold">{insights.communicationDNA.style} Communication</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {insights.communicationDNA.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Strength Level</span>
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: `${getDNAColor(insights.communicationDNA.style)}20`,
                      color: getDNAColor(insights.communicationDNA.style)
                    }}
                  >
                    {(insights.communicationDNA.strength * 100).toFixed(0)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Relationship Velocity */}
            <Card className="border border-secondary/20 bg-secondary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  <span className="font-semibold">Relationship Velocity</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {insights.relationshipVelocity.speed}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {insights.relationshipVelocity.direction}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getVelocityDescription()}
                </p>
              </CardContent>
            </Card>
            
            {/* Key Correlations */}
            <Card className="border border-accent/20 bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-accent" />
                  <span className="font-semibold">Pattern Recognition</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Honesty ↔ Intimacy</span>
                    <Badge 
                      variant={metrics.correlations.honestyIntimacy > 0.6 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {(metrics.correlations.honestyIntimacy * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Attraction ↔ Surprise</span>
                    <Badge 
                      variant={metrics.correlations.attractionSurprise > 0.6 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {(metrics.correlations.attractionSurprise * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Stability</span>
                    <Badge 
                      variant={metrics.correlations.overallStability > 0.7 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {(metrics.correlations.overallStability * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* DNA Insights */}
            {insights.uniqueStrengths.length > 0 && (
              <Card className="border border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">DNA Highlights</span>
                  </div>
                  <div className="space-y-1">
                    {insights.uniqueStrengths.slice(0, 3).map((strength, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full" />
                        <span className="text-sm text-yellow-800">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
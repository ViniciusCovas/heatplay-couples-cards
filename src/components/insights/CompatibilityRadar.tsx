import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { useGlobalInsights } from '@/hooks/useGlobalInsights';
import type { RoomAnalyticsData } from '@/hooks/useRoomAnalytics';

interface CompatibilityRadarProps {
  insights: ConnectionInsightsData;
  analytics?: RoomAnalyticsData | null;
}

export const CompatibilityRadar = ({ insights, analytics }: CompatibilityRadarProps) => {
  const { data: global } = useGlobalInsights();

  const session = analytics?.sessionAverages;
  const to5 = (n?: number | null) => (typeof n === 'number' ? Math.round(n * 10) / 10 : 0);
  const to5from100 = (n?: number | null) => (typeof n === 'number' ? Math.round((n / 20) * 10) / 10 : 0);

  const radarData = [
    { area: 'Honesty', yourScore: to5(session?.honesty), average: to5(global?.pillarAverages.honesty) },
    { area: 'Attraction', yourScore: to5(session?.attraction), average: to5(global?.pillarAverages.attraction) },
    { area: 'Intimacy', yourScore: to5(session?.intimacy), average: to5(global?.pillarAverages.intimacy) },
    { area: 'Surprise', yourScore: to5(session?.surprise), average: to5(global?.pillarAverages.surprise) },
    { area: 'Connection', yourScore: to5from100((insights as any).compatibilityScore), average: to5from100(global?.globalCompatibilityAvg ?? undefined) },
  ];

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          5-Point Connection Radar
        </h2>
        <p className="text-muted-foreground">
          Your relationship strength across the five core dimensions
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-lg hover-scale">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            Your Connection Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 40, right: 60, bottom: 40, left: 60 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeWidth={1.5}
                  radialLines={true}
                  className="opacity-60"
                />
                <PolarAngleAxis 
                  dataKey="area" 
                  tick={{ 
                    fontSize: 13, 
                    fontWeight: 600,
                    fill: 'hsl(var(--foreground))'
                  }}
                  className="text-sm font-semibold"
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]} 
                  tick={{ 
                    fontSize: 9, 
                    fill: 'hsl(var(--muted-foreground))'
                  }}
                  tickCount={6}
                  axisLine={false}
                />
                
                {/* Smooth fill for your scores */}
                <Radar 
                  name="Your Connection" 
                  dataKey="yourScore" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#radarGradient)"
                  fillOpacity={0.4}
                  strokeWidth={4}
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 3, 
                    stroke: 'white',
                    r: 7,
                    className: 'drop-shadow-sm hover:r-9 transition-all'
                  }}
                  className="animate-scale-in"
                />
                
                {/* Average baseline */}
                <Radar 
                  name="Average Couple" 
                  dataKey="average" 
                  stroke="hsl(var(--muted-foreground))" 
                  fill="hsl(var(--muted-foreground))" 
                  fillOpacity={0.08}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ 
                    fill: 'hsl(var(--muted-foreground))', 
                    strokeWidth: 1, 
                    r: 4 
                  }}
                />
                
                <Legend 
                  wrapperStyle={{
                    paddingTop: '24px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
                
                {/* Custom gradient definition */}
                <defs>
                  <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Enhanced score breakdown */}
          <div className="mt-8 grid grid-cols-5 gap-3">
            {radarData.map((item, index) => (
              <div key={item.area} className="text-center bg-muted/30 rounded-xl p-3 hover-scale">
                <div className="text-lg font-bold text-foreground">{item.yourScore}</div>
                <div className="text-xs text-muted-foreground font-medium">{item.area}</div>
                <div className="text-xs text-primary mt-1">
                  {item.yourScore > item.average ? '↗️ Above avg' : '→ Average'}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend explanation */}
          <div className="mt-6 flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary/40 border-2 border-primary"></div>
              <span className="text-muted-foreground font-medium">
                Your relationship strength
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-muted-foreground border-dashed"></div>
              <span className="text-muted-foreground font-medium">
                Global average baseline
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface CompatibilityRadarProps {
  insights: ConnectionInsightsData;
}

export const CompatibilityRadar = ({ insights }: CompatibilityRadarProps) => {
  // Transform strength areas into radar chart data
  const radarData = insights.strengthAreas?.map(strength => ({
    area: strength.area.charAt(0).toUpperCase() + strength.area.slice(1),
    yourScore: strength.score,
    average: 3.2, // Global average baseline
    maxScore: 5,
  })) || [];

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Relationship Compatibility Matrix
        </h2>
        <p className="text-muted-foreground">
          Your connection strength across all dimensions
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Your Relationship Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeWidth={1}
                  radialLines={true}
                />
                <PolarAngleAxis 
                  dataKey="area" 
                  tick={{ 
                    fontSize: 12, 
                    fontWeight: 600,
                    fill: 'hsl(var(--foreground))'
                  }}
                  className="text-sm font-medium"
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]} 
                  tick={{ 
                    fontSize: 10, 
                    fill: 'hsl(var(--muted-foreground))'
                  }}
                  tickCount={6}
                />
                
                {/* Your scores */}
                <Radar 
                  name="Your Relationship" 
                  dataKey="yourScore" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                  strokeWidth={3}
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 2, 
                    stroke: 'white',
                    r: 6 
                  }}
                />
                
                {/* Average baseline */}
                <Radar 
                  name="Average Couple" 
                  dataKey="average" 
                  stroke="hsl(var(--muted-foreground))" 
                  fill="hsl(var(--muted-foreground))" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ 
                    fill: 'hsl(var(--muted-foreground))', 
                    strokeWidth: 1, 
                    r: 3 
                  }}
                />
                
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend explanation */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary/30 border-2 border-primary"></div>
              <span className="text-muted-foreground">
                Your relationship scores across all dimensions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-muted-foreground border-dashed"></div>
              <span className="text-muted-foreground">
                Average couple baseline for comparison
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserHistoryInsights } from '@/hooks/useUserHistoryInsights';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface UserGrowthHistoryChartProps {
  roomCode: string;
}

export const UserGrowthHistoryChart: React.FC<UserGrowthHistoryChartProps> = ({ roomCode }) => {
  const { data } = useUserHistoryInsights(roomCode);
  const points = data?.points || [];

  if (!points.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compatibility Over Time (Your Sessions)</CardTitle>
      </CardHeader>
      <CardContent style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
            <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => `${value}%`} labelFormatter={(l) => new Date(l).toLocaleString()} />
            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            {points.map((p, i) => (
              p.roomCode === roomCode ? (
                <ReferenceDot key={`current-${i}`} x={p.date} y={p.score} r={5} fill="hsl(var(--accent))" stroke="hsl(var(--accent))" />
              ) : null
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground mt-3">Highlighted point is the current session.</div>
      </CardContent>
    </Card>
  );
};

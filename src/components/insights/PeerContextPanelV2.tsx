import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Scale } from 'lucide-react';
import { useComparativeInsights } from '@/hooks/useComparativeInsights';

interface PeerContextPanelV2Props {
  roomCode: string;
}

const PillarRow = ({ label, value, avg }: { label: string; value?: number; avg?: number }) => {
  if (value == null && avg == null) return null;
  const v = value ?? 0;
  const a = avg ?? 0;
  const delta = value != null && avg != null ? (v - a) : 0;
  const percent = Math.min(100, Math.max(0, (v / 5) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{v ? v.toFixed(1) : '—'}</span>
          <Badge variant="outline" className="text-[10px]">
            {delta > 0 ? '+':' '}{delta ? delta.toFixed(1) : '0.0'} vs avg
          </Badge>
        </div>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
};

export const PeerContextPanelV2: React.FC<PeerContextPanelV2Props> = ({ roomCode }) => {
  const { data } = useComparativeInsights(roomCode);
  if (!data) return null;
  const { sessionPillars, cohorts } = data;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Peer Context</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Neutral context for your session across global, level, language, and phase cohorts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.map((c) => (
          <Card key={c.name} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> {c.name}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  n={c.sampleSize}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <PillarRow label="Honesty" value={sessionPillars.honesty} avg={c.averages.honesty} />
              <PillarRow label="Attraction" value={sessionPillars.attraction} avg={c.averages.attraction} />
              <PillarRow label="Intimacy" value={sessionPillars.intimacy} avg={c.averages.intimacy} />
              <PillarRow label="Surprise" value={sessionPillars.surprise} avg={c.averages.surprise} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

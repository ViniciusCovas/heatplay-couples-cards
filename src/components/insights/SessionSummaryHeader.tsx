import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { RoomAnalyticsData } from '@/hooks/useRoomAnalytics';

interface SessionSummaryHeaderProps {
  insights: ConnectionInsightsData;
  analytics: RoomAnalyticsData | null;
}

const formatMs = (ms?: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
};

export const SessionSummaryHeader: React.FC<SessionSummaryHeaderProps> = ({ insights, analytics }) => {
  const avgRt = analytics?.sessionAverages.avgResponseTime ?? null;
  const count = analytics?.sessionAverages.responsesCount ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Overview</CardTitle>
        <CardDescription>Key metrics for this room, contrasted with your history elsewhere in the page.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-muted-foreground">Compatibility</div>
            <div className="text-2xl font-semibold text-primary">{insights.compatibilityScore}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Relationship Phase</div>
            <div className="text-2xl font-semibold">{insights.relationshipPhase}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Responses</div>
            <div className="text-2xl font-semibold">{count}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Avg Response Time</div>
            <div className="text-2xl font-semibold">{formatMs(avgRt)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

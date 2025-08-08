import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoomAnalyticsData, GlobalQuestionStatsItem } from '@/hooks/useRoomAnalytics';

interface PerQuestionScoresProps {
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

const fmt = (n?: number) => (typeof n === 'number' ? n.toFixed(1) : '—');

export const PerQuestionScores: React.FC<PerQuestionScoresProps> = ({ analytics }) => {
  if (!analytics || analytics.items.length === 0) return null;

  const { items, globalQuestionStats } = analytics;

  const renderGlobal = (qid: string, pick: (g: GlobalQuestionStatsItem) => number | undefined) => {
    const g = globalQuestionStats[qid];
    if (!g) return '—';
    const val = pick(g);
    return typeof val === 'number' ? val.toFixed(1) : '—';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per‑Question Scores (This Session vs Global)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">Honesty</TableHead>
                <TableHead className="text-right">Attraction</TableHead>
                <TableHead className="text-right">Intimacy</TableHead>
                <TableHead className="text-right">Surprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="max-w-[420px] whitespace-normal">{it.questionText}</TableCell>
                  <TableCell className="text-right">{formatMs(it.responseTime)}<div className="text-xs text-muted-foreground">{formatMs((globalQuestionStats[it.questionId]?.avgResponseTime) ?? null)}</div></TableCell>
                  <TableCell className="text-right">{fmt(it.evaluation?.honesty)}<div className="text-xs text-muted-foreground">{renderGlobal(it.questionId, g => g.honesty)}</div></TableCell>
                  <TableCell className="text-right">{fmt(it.evaluation?.attraction)}<div className="text-xs text-muted-foreground">{renderGlobal(it.questionId, g => g.attraction)}</div></TableCell>
                  <TableCell className="text-right">{fmt(it.evaluation?.intimacy)}<div className="text-xs text-muted-foreground">{renderGlobal(it.questionId, g => g.intimacy)}</div></TableCell>
                  <TableCell className="text-right">{fmt(it.evaluation?.surprise)}<div className="text-xs text-muted-foreground">{renderGlobal(it.questionId, g => g.surprise)}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Top values: this session; small text: global averages for the same questions.</div>
      </CardContent>
    </Card>
  );
};

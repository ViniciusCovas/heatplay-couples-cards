import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResponseTimeDistributionBucket {
  label: string;
  minMs: number;
  maxMs: number | null; // null = open-ended upper bound
  count: number;
}

export interface GlobalInsightsData {
  globalCompatibilityAvg: number | null;
  sessionsCount: number;
  phaseDistribution: Record<string, number>;
  responsesCount: number;
  responseTimeMedian: number | null;
  responseTimeDistribution: ResponseTimeDistributionBucket[];
  pillarAverages: {
    honesty?: number;
    attraction?: number;
    intimacy?: number;
    surprise?: number;
  };
}

const median = (arr: number[]) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

const average = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

const safeParseEvaluation = (value: any) => {
  if (!value) return null;
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    return obj || null;
  } catch {
    return null;
  }
};

export const useGlobalInsights = () => {
  return useQuery<GlobalInsightsData>({
    queryKey: ['global-insights-v1'],
    staleTime: 1000 * 60 * 30, // 30 minutes
    queryFn: async () => {
      // Global compatibility and phase distribution from AI analyses
      const { data: analyses } = await supabase
        .from('ai_analyses')
        .select('ai_response')
        .eq('analysis_type', 'getclose-ai-analysis');

      let sessionsCount = analyses?.length || 0;
      let compScores: number[] = [];
      let phaseDistribution: Record<string, number> = {};
      (analyses || []).forEach(a => {
        const ai = a.ai_response as any;
        const cs = ai?.compatibilityScore;
        if (typeof cs === 'number') compScores.push(cs);
        const ph = ai?.relationshipPhase;
        if (typeof ph === 'string') phaseDistribution[ph] = (phaseDistribution[ph] || 0) + 1;
      });
      const globalCompatibilityAvg = average(compScores);

      // Global response times and pillar averages from responses (limit for performance)
      const { data: responses } = await supabase
        .from('game_responses')
        .select('response_time, evaluation')
        .order('created_at', { ascending: false })
        .limit(5000);

      const rt: number[] = [];
      const h: number[] = [];
      const a: number[] = [];
      const i: number[] = [];
      const s: number[] = [];

      (responses || []).forEach(r => {
        if (typeof r.response_time === 'number') rt.push(r.response_time);
        const ev = safeParseEvaluation(r.evaluation);
        if (ev?.honesty !== undefined) h.push(ev.honesty);
        if (ev?.attraction !== undefined) a.push(ev.attraction);
        if (ev?.intimacy !== undefined) i.push(ev.intimacy);
        if (ev?.surprise !== undefined) s.push(ev.surprise);
      });

      const responseTimeMedian = median(rt);

      const buckets: ResponseTimeDistributionBucket[] = [
        { label: '0-10s', minMs: 0, maxMs: 10000, count: 0 },
        { label: '10-30s', minMs: 10000, maxMs: 30000, count: 0 },
        { label: '30-60s', minMs: 30000, maxMs: 60000, count: 0 },
        { label: '1-2m', minMs: 60000, maxMs: 120000, count: 0 },
        { label: '2m+', minMs: 120000, maxMs: null, count: 0 },
      ];
      rt.forEach(ms => {
        const bucket = buckets.find(b => (ms >= b.minMs) && (b.maxMs === null || ms < b.maxMs));
        if (bucket) bucket.count += 1;
      });

      return {
        globalCompatibilityAvg: globalCompatibilityAvg ?? null,
        sessionsCount,
        phaseDistribution,
        responsesCount: responses?.length || 0,
        responseTimeMedian,
        responseTimeDistribution: buckets,
        pillarAverages: {
          honesty: average(h) ?? undefined,
          attraction: average(a) ?? undefined,
          intimacy: average(i) ?? undefined,
          surprise: average(s) ?? undefined,
        },
      };
    },
  });
};

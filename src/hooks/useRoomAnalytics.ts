import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PillarScores {
  honesty?: number;
  attraction?: number;
  intimacy?: number;
  surprise?: number;
}

export interface RoomQuestionItem {
  id: string;
  questionId: string;
  questionText: string;
  category?: string | null;
  intensity?: number | null;
  responseTime?: number | null; // ms
  evaluation?: PillarScores | null;
  created_at?: string;
}

export interface SessionAverages extends PillarScores {
  avgResponseTime?: number | null;
  responsesCount: number;
}

export interface GlobalQuestionStatsItem extends PillarScores {
  avgResponseTime?: number | null;
  count: number;
}

export interface RoomAnalyticsData {
  room: {
    id: string;
    created_at: string;
    level: number;
    language?: string | null;
    host_user_id?: string | null;
  } | null;
  items: RoomQuestionItem[];
  sessionAverages: SessionAverages;
  globalQuestionStats: Record<string, GlobalQuestionStatsItem>; // key: questionId
}

const safeParseEvaluation = (value: any): PillarScores | null => {
  if (!value) return null;
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    const { honesty, attraction, intimacy, surprise } = obj || {};
    const pick = (n: any) => (typeof n === 'number' ? n : undefined);
    return {
      honesty: pick(honesty),
      attraction: pick(attraction),
      intimacy: pick(intimacy),
      surprise: pick(surprise),
    };
  } catch {
    return null;
  }
};

const average = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

export const useRoomAnalytics = (roomCode: string) => {
  return useQuery<RoomAnalyticsData | null>({
    queryKey: ['room-analytics', roomCode],
    enabled: !!roomCode,
    retry: false,
    queryFn: async () => {
      if (!roomCode) return null;

      const { data: room } = await supabase
        .from('game_rooms')
        .select('id, level, selected_language, created_at, host_user_id')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (!room?.id) return {
        room: null,
        items: [],
        sessionAverages: { responsesCount: 0, avgResponseTime: null },
        globalQuestionStats: {},
      };

      const roomId = room.id as string;

      const { data: responses } = await supabase
        .from('game_responses')
        .select('id, round_number, response_time, evaluation, player_id, card_id, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      const questionIds = Array.from(new Set((responses || []).map(r => r.card_id).filter(Boolean)));

      let questionsById: Record<string, any> = {};
      if (questionIds.length) {
        const { data: questions } = await supabase
          .from('questions')
          .select('id, text, category, intensity, language')
          .in('id', questionIds as string[]);
        (questions || []).forEach(q => { questionsById[q.id as string] = q; });
      }

      const items: RoomQuestionItem[] = (responses || []).map(r => {
        const evalObj = safeParseEvaluation(r.evaluation);
        const q = questionsById[r.card_id as string] || {};
        return {
          id: r.id as string,
          questionId: (r.card_id as string) || 'unknown',
          questionText: q.text || 'Unknown question',
          category: q.category ?? null,
          intensity: q.intensity ?? null,
          responseTime: r.response_time ?? null,
          evaluation: evalObj,
          created_at: r.created_at as string,
        };
      });

      // Session averages
      const responsesCount = items.length;
      const avgResponseTime = average(items.map(i => i.responseTime).filter((n): n is number => typeof n === 'number'));
      const avg = (key: keyof PillarScores) => average(items.map(i => i.evaluation?.[key]).filter((n): n is number => typeof n === 'number')) || undefined;

      const sessionAverages: SessionAverages = {
        responsesCount,
        avgResponseTime,
        honesty: avg('honesty'),
        attraction: avg('attraction'),
        intimacy: avg('intimacy'),
        surprise: avg('surprise'),
      };

      // Global stats for used questions
      let globalQuestionStats: Record<string, GlobalQuestionStatsItem> = {};
      if (questionIds.length) {
        const { data: globalResps } = await supabase
          .from('game_responses')
          .select('card_id, response_time, evaluation')
          .in('card_id', questionIds as string[]);

        const bucket: Record<string, { rt: number[]; h: number[]; a: number[]; i: number[]; s: number[]; count: number } > = {};
        (globalResps || []).forEach(gr => {
          const qid = gr.card_id as string;
          if (!bucket[qid]) bucket[qid] = { rt: [], h: [], a: [], i: [], s: [], count: 0 };
          const ev = safeParseEvaluation(gr.evaluation);
          if (typeof gr.response_time === 'number') bucket[qid].rt.push(gr.response_time);
          if (ev?.honesty !== undefined) bucket[qid].h.push(ev.honesty);
          if (ev?.attraction !== undefined) bucket[qid].a.push(ev.attraction);
          if (ev?.intimacy !== undefined) bucket[qid].i.push(ev.intimacy);
          if (ev?.surprise !== undefined) bucket[qid].s.push(ev.surprise);
          bucket[qid].count += 1;
        });

        Object.keys(bucket).forEach(qid => {
          const b = bucket[qid];
          globalQuestionStats[qid] = {
            avgResponseTime: average(b.rt),
            honesty: average(b.h) ?? undefined,
            attraction: average(b.a) ?? undefined,
            intimacy: average(b.i) ?? undefined,
            surprise: average(b.s) ?? undefined,
            count: b.count,
          };
        });
      }

      return {
        room: {
          id: room.id as string,
          created_at: room.created_at as string,
          level: room.level as number,
          language: room.selected_language as string | null,
          host_user_id: room.host_user_id as string | null,
        },
        items,
        sessionAverages,
        globalQuestionStats,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PillarScores } from './useRoomAnalytics';

export interface ComparativeCohort {
  name: string;
  averages: PillarScores;
  sampleSize: number; // number of responses considered
}

export interface ComparativeInsightsData {
  sessionPillars: PillarScores;
  cohorts: ComparativeCohort[];
}

const average = (arr: number[]) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : undefined);

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

const computePillars = (evaluations: PillarScores[]): PillarScores => {
  const h = evaluations.map(e => e.honesty).filter((n): n is number => typeof n === 'number');
  const a = evaluations.map(e => e.attraction).filter((n): n is number => typeof n === 'number');
  const i = evaluations.map(e => e.intimacy).filter((n): n is number => typeof n === 'number');
  const s = evaluations.map(e => e.surprise).filter((n): n is number => typeof n === 'number');
  return {
    honesty: average(h),
    attraction: average(a),
    intimacy: average(i),
    surprise: average(s),
  };
};

export const useComparativeInsights = (roomCode: string) => {
  return useQuery<ComparativeInsightsData | null>({
    queryKey: ['comparative-insights', roomCode],
    enabled: !!roomCode,
    staleTime: 1000 * 60 * 10,
    retry: false,
    queryFn: async () => {
      if (!roomCode) return null;

      // Fetch current room info
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id, level, selected_language')
        .eq('room_code', roomCode)
        .maybeSingle();
      if (!room?.id) return null;

      const roomId = room.id as string;

      // Fetch session evaluations for this room
      const { data: sessionResps } = await supabase
        .from('game_responses')
        .select('evaluation')
        .eq('room_id', roomId)
        .limit(1000);
      const sessionEvals = (sessionResps || [])
        .map(r => safeParseEvaluation(r.evaluation))
        .filter(Boolean) as PillarScores[];
      const sessionPillars = computePillars(sessionEvals);

      // Prepare cohorts
      const cohorts: ComparativeCohort[] = [];

      // 1) Global
      const { data: globalResps } = await supabase
        .from('game_responses')
        .select('evaluation')
        .order('created_at', { ascending: false })
        .limit(5000);
      const globalEvals = (globalResps || [])
        .map(r => safeParseEvaluation(r.evaluation))
        .filter(Boolean) as PillarScores[];
      cohorts.push({ name: 'Global', averages: computePillars(globalEvals), sampleSize: globalEvals.length });

      // 2) Level cohort
      if (typeof room.level === 'number') {
        const { data: levelRooms } = await supabase
          .from('game_rooms')
          .select('id')
          .eq('level', room.level)
          .limit(1000);
        const levelRoomIds = (levelRooms || []).map(r => r.id as string).filter(Boolean);
        if (levelRoomIds.length) {
          const { data: levelResps } = await supabase
            .from('game_responses')
            .select('evaluation')
            .in('room_id', levelRoomIds)
            .order('created_at', { ascending: false })
            .limit(5000);
          const levelEvals = (levelResps || [])
            .map(r => safeParseEvaluation(r.evaluation))
            .filter(Boolean) as PillarScores[];
          cohorts.push({ name: `Level ${room.level}`, averages: computePillars(levelEvals), sampleSize: levelEvals.length });
        }
      }

      // 3) Language cohort
      if (room.selected_language) {
        const { data: langRooms } = await supabase
          .from('game_rooms')
          .select('id')
          .eq('selected_language', room.selected_language)
          .limit(1000);
        const langRoomIds = (langRooms || []).map(r => r.id as string).filter(Boolean);
        if (langRoomIds.length) {
          const { data: langResps } = await supabase
            .from('game_responses')
            .select('evaluation')
            .in('room_id', langRoomIds)
            .order('created_at', { ascending: false })
            .limit(5000);
          const langEvals = (langResps || [])
            .map(r => safeParseEvaluation(r.evaluation))
            .filter(Boolean) as PillarScores[];
          cohorts.push({ name: `Language ${room.selected_language}`, averages: computePillars(langEvals), sampleSize: langEvals.length });
        }
      }

      // 4) Phase cohort (based on AI analysis)
      const { data: thisAnalysis } = await supabase
        .from('ai_analyses')
        .select('ai_response, room_id')
        .eq('room_id', roomId)
        .eq('analysis_type', 'getclose-ai-analysis')
        .maybeSingle();
      const phase = (thisAnalysis?.ai_response as any)?.relationshipPhase as string | undefined;
      if (phase) {
        const { data: phaseAnalyses } = await supabase
          .from('ai_analyses')
          .select('room_id, ai_response')
          .eq('analysis_type', 'getclose-ai-analysis');
        const phaseRoomIds = (phaseAnalyses || [])
          .filter(a => (a.ai_response as any)?.relationshipPhase === phase)
          .map(a => a.room_id as string);
        if (phaseRoomIds.length) {
          const { data: phaseResps } = await supabase
            .from('game_responses')
            .select('evaluation')
            .in('room_id', phaseRoomIds)
            .order('created_at', { ascending: false })
            .limit(5000);
          const phaseEvals = (phaseResps || [])
            .map(r => safeParseEvaluation(r.evaluation))
            .filter(Boolean) as PillarScores[];
          cohorts.push({ name: `Phase: ${phase}`, averages: computePillars(phaseEvals), sampleSize: phaseEvals.length });
        }
      }

      return { sessionPillars, cohorts };
    },
  });
};

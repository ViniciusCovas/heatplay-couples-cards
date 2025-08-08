import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HistoryPoint {
  date: string;
  score: number;
  roomCode: string;
}

export const useUserHistoryInsights = (roomCode: string) => {
  return useQuery<{ points: HistoryPoint[] } | null>({
    queryKey: ['user-history-insights', roomCode],
    queryFn: async () => {
      if (!roomCode) return null;
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id, host_user_id, room_code, created_at')
        .eq('room_code', roomCode)
        .single();
      if (!room?.host_user_id) return { points: [] };

      const { data: userRooms } = await supabase
        .from('game_rooms')
        .select('id, room_code, created_at')
        .eq('host_user_id', room.host_user_id)
        .order('created_at', { ascending: true });

      const roomIds = (userRooms || []).map(r => r.id);
      if (roomIds.length === 0) return { points: [] };

      const { data: analyses } = await supabase
        .from('ai_analyses')
        .select('room_id, created_at, ai_response')
        .in('room_id', roomIds)
        .eq('analysis_type', 'getclose-ai-analysis');

      const points: HistoryPoint[] = (analyses || [])
        .map(a => {
          const r = (userRooms || []).find(ur => ur.id === a.room_id);
          const score = (a.ai_response as any)?.compatibilityScore ?? null;
          if (r && typeof score === 'number') {
            return { date: a.created_at || r.created_at, score, roomCode: r.room_code };
          }
          return null;
        })
        .filter(Boolean) as HistoryPoint[];

      points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { points };
    },
    enabled: !!roomCode,
    retry: false,
  });
};

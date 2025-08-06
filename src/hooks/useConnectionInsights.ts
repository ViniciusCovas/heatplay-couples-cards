import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConnectionInsightsData {
  compatibilityScore: number;
  relationshipPhase: string;
  strengthAreas: Array<{
    area: string;
    score: number;
    insight: string;
  }>;
  growthAreas: Array<{
    area: string;
    score: number;
    recommendation: string;
  }>;
  keyInsights: string[];
  personalizedTips: string[];
  culturalNotes?: string;
  nextSessionRecommendation?: string;
  sessionData: {
    roomCode: string;
    level: number;
    responseCount: number;
    averageResponseTime: number;
    createdAt: string;
  };
}

export const useConnectionInsights = (roomCode: string) => {
  return useQuery({
    queryKey: ['connection-insights', roomCode],
    queryFn: async (): Promise<ConnectionInsightsData | null> => {
      if (!roomCode) return null;

      // Find the room by code
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError || !room) {
        throw new Error('Room not found');
      }

      // Get AI analysis for this room
      const { data: analysis, error: analysisError } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('room_id', room.id)
        .eq('analysis_type', 'getclose-ai-analysis')
        .order('created_at', { ascending: false })
        .limit(1);

      if (analysisError || !analysis || analysis.length === 0) {
        throw new Error('No AI analysis found for this room');
      }

      const aiResponse = analysis[0].ai_response as any;

      // Get session statistics
      const { data: responses } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room.id);

      const responseCount = responses?.length || 0;
      const averageResponseTime = responses?.length 
        ? Math.round(responses.reduce((sum, r) => sum + (r.response_time || 0), 0) / responses.length)
        : 0;

      return {
        compatibilityScore: aiResponse.compatibilityScore || 0,
        relationshipPhase: aiResponse.relationshipPhase || 'exploring',
        strengthAreas: aiResponse.strengthAreas || [],
        growthAreas: aiResponse.growthAreas || [],
        keyInsights: aiResponse.keyInsights || [],
        personalizedTips: aiResponse.personalizedTips || [],
        culturalNotes: aiResponse.culturalNotes,
        nextSessionRecommendation: aiResponse.nextSessionRecommendation,
        sessionData: {
          roomCode: room.room_code,
          level: room.level,
          responseCount,
          averageResponseTime,
          createdAt: room.created_at,
        },
      };
    },
    enabled: !!roomCode,
    retry: false,
  });
};
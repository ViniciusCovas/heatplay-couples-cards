import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ResponseData {
  response: string;
  responseTime: number;
  playerId: string;
}

export const useResponseData = (
  roomId: string | null,
  cardId: string,
  roundNumber: number,
  shouldFetch: boolean,
  currentPlayerId: string // Add current player ID to avoid fetching own response
) => {
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetch || !roomId || !cardId || !currentPlayerId) {
      console.log('🚫 useResponseData: Not fetching', { shouldFetch, roomId, cardId, currentPlayerId });
      return;
    }

    const fetchResponseData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 useResponseData: Fetching response data:', {
          roomId: roomId.substring(0, 8) + '...',
          cardId: cardId.substring(0, 30) + '...',
          roundNumber,
          excludePlayerId: currentPlayerId
        });
        
        // Get the most recent response for this card that is NOT from the current player
        const { data, error } = await supabase
          .from('game_responses')
          .select('response, response_time, player_id, created_at')
          .eq('room_id', roomId)
          .eq('card_id', cardId)
          .eq('round_number', roundNumber)
          .neq('player_id', currentPlayerId) // Exclude current player's responses
          .not('response', 'is', null) // Only get responses that exist
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid errors when no data found

        if (error) {
          console.error('❌ useResponseData: Database error:', error);
          setError('Could not fetch response data');
          return;
        }

        if (data) {
          console.log('✅ useResponseData: Found response to evaluate:', {
            hasResponse: !!data.response,
            responseTime: data.response_time,
            playerId: data.player_id,
            responsePreview: data.response?.substring(0, 30) + '...'
          });
          setResponseData({
            response: data.response || '',
            responseTime: data.response_time || 0,
            playerId: data.player_id
          });
        } else {
          console.log('⚠️ useResponseData: No response found for evaluation');
          setError('No response found to evaluate');
          setResponseData(null);
        }
      } catch (err) {
        console.error('❌ useResponseData: Unexpected error:', err);
        setError('Unexpected error occurred');
        setResponseData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponseData();
  }, [roomId, cardId, roundNumber, shouldFetch, currentPlayerId]);

  return { responseData, isLoading, error };
};
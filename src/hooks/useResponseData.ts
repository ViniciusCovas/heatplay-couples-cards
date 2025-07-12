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
  shouldFetch: boolean
) => {
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetch || !roomId || !cardId) {
      return;
    }

    const fetchResponseData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('game_responses')
          .select('response, response_time, player_id')
          .eq('room_id', roomId)
          .eq('card_id', cardId)
          .eq('round_number', roundNumber)
          .single();

        if (error) {
          console.error('Error fetching response data:', error);
          setError('Could not fetch response data');
          return;
        }

        if (data) {
          setResponseData({
            response: data.response || '',
            responseTime: data.response_time || 0,
            playerId: data.player_id
          });
        }
      } catch (err) {
        console.error('Unexpected error fetching response data:', err);
        setError('Unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponseData();
  }, [roomId, cardId, roundNumber, shouldFetch]);

  return { responseData, isLoading, error };
};
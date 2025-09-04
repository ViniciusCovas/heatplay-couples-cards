import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface UsePlayerNumberProps {
  roomId: string | null;
  playerId: string;
}

export const usePlayerNumber = ({ roomId, playerId }: UsePlayerNumberProps) => {
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !playerId) {
      setPlayerNumber(null);
      setLoading(false);
      return;
    }

    const fetchPlayerNumber = async () => {
      try {
        const { data, error } = await supabase
          .from('room_participants')
          .select('player_number')
          .eq('room_id', roomId)
          .eq('player_id', playerId)
          .single();

        if (error) {
          logger.error('Failed to fetch player number:', error);
          setPlayerNumber(null);
        } else {
          setPlayerNumber(data.player_number as 1 | 2);
          logger.debug('Player number fetched:', { playerId, playerNumber: data.player_number });
        }
      } catch (err) {
        logger.error('Error fetching player number:', err);
        setPlayerNumber(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchPlayerNumber();

    // Set up real-time subscription for player number changes
    const channel = supabase
      .channel(`room_participants_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          logger.debug('Room participants changed:', payload);
          fetchPlayerNumber(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  const isPlayer1 = playerNumber === 1;
  const isPlayer2 = playerNumber === 2;

  return {
    playerNumber,
    isPlayer1,
    isPlayer2,
    loading
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

interface LevelSelectionResult {
  status: 'waiting' | 'agreed' | 'mismatch' | 'error';
  message: string;
  selected_level?: number;
  player_level?: number;
  other_level?: number;
  countdown?: number;
}

interface UseLevelSelectionReturn {
  submitLevelVote: (level: number) => Promise<void>;
  isWaitingForPartner: boolean;
  agreedLevel: number | null;
  hasVoted: boolean;
  selectedLevel: number | null;
  countdown: number | null;
  levelsMismatch: boolean;
  tryAgain: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export const useLevelSelection = (roomId: string | null, playerId: string): UseLevelSelectionReturn => {
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [agreedLevel, setAgreedLevel] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [levelsMismatch, setLevelsMismatch] = useState(false);
  const { t } = useTranslation();

  // Add state reset timeout to prevent stuck states
  const [lastActionTime, setLastActionTime] = useState<number>(Date.now());

  // Submit level vote using atomic RPC function
  const submitLevelVote = useCallback(async (level: number) => {
    if (!roomId) {
      logger.error('No room ID for level vote');
      toast.error('Room not connected. Please try again.');
      return;
    }

    logger.debug('Submitting level vote', { roomId, playerId, level });
    
    try {
      // Call the atomic level selection function using Supabase RPC
      // Cast to any to bypass TypeScript checks - PostgreSQL will handle UUID conversion
      const { data: result, error } = await supabase.rpc('handle_level_selection', {
        room_id_param: roomId as any,
        player_id_param: playerId as any,
        selected_level_param: level
      });

      if (error) {
        logger.error('RPC call failed', error);
        toast.error('Failed to select level. Please try again.');
        return;
      }
      logger.debug('Level selection result', result);

      // Type assertion since we know this is our custom function return type
      const typedResult = result as unknown as LevelSelectionResult;
      setSelectedLevel(level);
      setHasVoted(true);
      setLastActionTime(Date.now());

      // Handle the response based on status
      switch (typedResult.status) {
        case 'waiting':
          setIsWaitingForPartner(true);
          setLevelsMismatch(false);
          setCountdown(null);
          toast.info(typedResult.message);
          break;

        case 'agreed':
          setIsWaitingForPartner(false);
          setLevelsMismatch(false);
          setAgreedLevel(typedResult.selected_level || level);
          
          // Start countdown if provided
          if (typedResult.countdown) {
            setCountdown(typedResult.countdown);
            toast.success(typedResult.message);
            
            let timeLeft = typedResult.countdown;
            const countdownInterval = setInterval(() => {
              timeLeft--;
              setCountdown(timeLeft);
              
              if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                setCountdown(null);
              }
            }, 1000);
          }
          break;

        case 'mismatch':
          setLevelsMismatch(true);
          setIsWaitingForPartner(false);
          setCountdown(null);
          toast.error(typedResult.message);
          
          // Auto-reset after 3 seconds
          setTimeout(() => {
            tryAgain();
          }, 3000);
          break;

        case 'error':
          toast.error(typedResult.message);
          break;
      }
    } catch (error) {
      logger.error('Exception in level selection', error);
      toast.error(t('game.errors.levelSelectionFailed'));
    }
  }, [roomId, playerId, t]);

  // Reset function for mismatch scenarios
  const tryAgain = useCallback(async () => {
    logger.debug('Resetting level selection state');
    
    setHasVoted(false);
    setSelectedLevel(null);
    setIsWaitingForPartner(false);
    setLevelsMismatch(false);
    setCountdown(null);
    setAgreedLevel(null);
    setLastActionTime(Date.now());
    
    toast.info(t('levelSelect.readyToSelect'));
  }, [t]);

  // Check current room state on mount and reset stale states
  useEffect(() => {
    if (!roomId) return;

    const checkRoomState = async () => {
      try {
        // Check if room is already past level selection
        const { data: room, error } = await supabase
          .from('game_rooms')
          .select('current_phase, level')
          .eq('id', roomId)
          .single();

        if (error) throw error;

        if (room?.current_phase === 'card-display' && room.level) {
          logger.debug('Room already in card-display phase, syncing state');
          setAgreedLevel(room.level);
          setIsWaitingForPartner(false);
          setLevelsMismatch(false);
          setCountdown(null);
        } else if (room?.current_phase === 'level-selection') {
          // Reset any stale waiting states when entering level selection
          logger.debug('Room in level-selection phase, resetting stale states');
          setIsWaitingForPartner(false);
          setLevelsMismatch(false);
          setCountdown(null);
          setAgreedLevel(null);
        }
      } catch (error) {
        logger.error('Error checking room state', error);
      }
    };

    checkRoomState();
  }, [roomId]);

  // Auto-reset stuck states after timeout
  useEffect(() => {
    if (!isWaitingForPartner && !agreedLevel) return;

    const timeout = setTimeout(() => {
      const timeElapsed = Date.now() - lastActionTime;
      if (timeElapsed > 30000) { // 30 seconds timeout
        logger.warn('Level selection stuck for 30s, auto-resetting');
        tryAgain();
      }
    }, 31000);

    return () => clearTimeout(timeout);
  }, [isWaitingForPartner, agreedLevel, lastActionTime, tryAgain]);

  // Listen for room phase changes (main real-time listener)
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`level-select-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          logger.debug('Room update received', payload);
          const room = payload.new as any;
          
          if (room.current_phase === 'card-display' && room.level) {
            logger.debug('Room moved to card-display phase');
            setAgreedLevel(room.level);
            setIsWaitingForPartner(false);
            setLevelsMismatch(false);
            setCountdown(null);
            toast.success(t('levelSelect.gameStarting'));
          }
        }
      )
      .subscribe();

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 100);
    };
  }, [roomId, t]);

  // Force sync function (simplified)
  const forceSync = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('current_phase, level')
        .eq('id', roomId)
        .single();

      if (!error && room?.current_phase === 'card-display' && room.level) {
        setAgreedLevel(room.level);
        setIsWaitingForPartner(false);
        setLevelsMismatch(false);
        setCountdown(null);
      }
    } catch (error) {
      logger.error('Error in force sync', error);
    }
  }, [roomId]);

  return {
    submitLevelVote,
    isWaitingForPartner,
    agreedLevel,
    hasVoted,
    selectedLevel,
    countdown,
    levelsMismatch,
    tryAgain,
    forceSync
  };
};
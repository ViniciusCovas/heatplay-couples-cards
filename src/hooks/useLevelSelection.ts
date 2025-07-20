import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

  // Submit level vote using atomic RPC function
  const submitLevelVote = useCallback(async (level: number) => {
    if (!roomId) {
      console.error('❌ No room ID for level vote');
      return;
    }

    console.log('🗳️ Submitting level vote:', { roomId, playerId, level });
    
    try {
      // Call the atomic level selection function using direct RPC call
      const response = await fetch(`https://bbdeyohqrutithaziulp.supabase.co/rest/v1/rpc/handle_level_selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog`
        },
        body: JSON.stringify({
          room_id_param: roomId,
          player_id_param: playerId,
          selected_level_param: level
        })
      });

      if (!response.ok) {
        console.error('❌ RPC call failed:', response.status, response.statusText);
        toast.error('Failed to select level. Please try again.');
        return;
      }

      const result = await response.json() as LevelSelectionResult;
      console.log('✅ Level selection result:', result);

      setSelectedLevel(level);
      setHasVoted(true);

      // Handle the response based on status
      switch (result.status) {
        case 'waiting':
          setIsWaitingForPartner(true);
          setLevelsMismatch(false);
          setCountdown(null);
          toast.info(result.message);
          break;

        case 'agreed':
          setIsWaitingForPartner(false);
          setLevelsMismatch(false);
          setAgreedLevel(result.selected_level || level);
          
          // Start countdown if provided
          if (result.countdown) {
            setCountdown(result.countdown);
            toast.success(result.message);
            
            let timeLeft = result.countdown;
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
          toast.error(result.message);
          
          // Auto-reset after 3 seconds
          setTimeout(() => {
            tryAgain();
          }, 3000);
          break;

        case 'error':
          toast.error(result.message);
          break;
      }
    } catch (error) {
      console.error('❌ Exception in level selection:', error);
      toast.error(t('game.errors.levelSelectionFailed'));
    }
  }, [roomId, playerId, t]);

  // Reset function for mismatch scenarios
  const tryAgain = useCallback(async () => {
    console.log('🔄 Resetting level selection state');
    
    setHasVoted(false);
    setSelectedLevel(null);
    setIsWaitingForPartner(false);
    setLevelsMismatch(false);
    setCountdown(null);
    setAgreedLevel(null);
    
    toast.info(t('levelSelect.readyToSelect'));
  }, [t]);

  // Check current room state on mount
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
          console.log('🎯 Room already in card-display phase, syncing state');
          setAgreedLevel(room.level);
          setIsWaitingForPartner(false);
          setLevelsMismatch(false);
          setCountdown(null);
        }
      } catch (error) {
        console.error('Error checking room state:', error);
      }
    };

    checkRoomState();
  }, [roomId]);

  // Listen for room phase changes (main real-time listener)
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('📨 Room update received:', payload);
          const room = payload.new as any;
          
          if (room.current_phase === 'card-display' && room.level) {
            console.log('🎯 Room moved to card-display phase');
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
      supabase.removeChannel(channel);
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
      console.error('Error in force sync:', error);
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
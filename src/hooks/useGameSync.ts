import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface GameSyncAction {
  id: string;
  room_id: string;
  action_type: 'proximity_answer' | 'card_reveal' | 'response_submit' | 'evaluation_submit' | 'level_change' | 'navigate_to_level_select' | 'turn_advance' | 'game_finish' | 'change_level_request' | 'level_mismatch' | 'level_change_request';
  action_data: any;
  triggered_by: string;
  created_at: string;
}

interface GameState {
  current_phase: 'proximity-selection' | 'card-display' | 'response-input' | 'evaluation' | 'level-select' | 'waiting-for-evaluation';
  proximity_question_answered: boolean;
  proximity_response: boolean | null;
  current_turn: 'player1' | 'player2';
  current_card: string | null;
  current_card_index: number;
  used_cards: string[];
}

interface UseGameSyncReturn {
  gameState: GameState | null;
  syncAction: (action_type: GameSyncAction['action_type'], action_data: any) => Promise<void>;
  updateGameState: (updates: Partial<GameState>) => Promise<void>;
  isLoading: boolean;
}

export const useGameSync = (roomId: string | null, playerId: string): UseGameSyncReturn => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, i18n } = useTranslation();

  // Debug language consistency
  console.log('🌍 useGameSync language:', i18n.language);

  // Load initial game state
  useEffect(() => {
    if (!roomId) return;

    const loadGameState = async () => {
      try {
        const { data: room, error } = await supabase
          .from('game_rooms')
          .select('current_phase, proximity_question_answered, proximity_response, current_turn, current_card, current_card_index, used_cards')
          .eq('id', roomId)
          .single();

        if (error) throw error;

        if (room) {
          setGameState({
            current_phase: (room.current_phase as GameState['current_phase']) || 'proximity-selection',
            proximity_question_answered: room.proximity_question_answered || false,
            proximity_response: room.proximity_response,
            current_turn: (room.current_turn as GameState['current_turn']) || 'player1',
            current_card: room.current_card,
            current_card_index: room.current_card_index || 0,
            used_cards: room.used_cards || []
          });
        }
      } catch (error) {
        // Silent error handling for game state loading
      }
    };

    loadGameState();
  }, [roomId]);

  // Listen to real-time game sync updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-sync-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_sync',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const action = payload.new as GameSyncAction;
          
          // Only process actions from other players
          if (action.triggered_by === playerId) return;

          handleSyncAction(action);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          const updatedRoom = payload.new as any;
          setGameState({
            current_phase: (updatedRoom.current_phase as GameState['current_phase']) || 'proximity-selection',
            proximity_question_answered: updatedRoom.proximity_question_answered || false,
            proximity_response: updatedRoom.proximity_response,
            current_turn: (updatedRoom.current_turn as GameState['current_turn']) || 'player1',
            current_card: updatedRoom.current_card,
            current_card_index: updatedRoom.current_card_index || 0,
            used_cards: updatedRoom.used_cards || []
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  const handleSyncAction = async (action: GameSyncAction) => {
    // Add small delay to prevent notification overlap
    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      // Dismiss existing toasts and show new one after delay
      setTimeout(() => {
        switch(type) {
          case 'success':
            toast.success(message);
            break;
          case 'error':
            toast.error(message);
            break;
          default:
            toast.info(message);
        }
      }, 100);
    };

    switch (action.action_type) {
      case 'proximity_answer':
        showToast(t('game.notifications.partnerAnswered'), 'success');
        break;
      case 'navigate_to_level_select':
        showToast(t('game.notifications.navigatingToLevelSelect'), 'success');
        break;
      case 'card_reveal':
        showToast(t('game.notifications.newCardRevealed'));
        break;
      case 'response_submit':
        showToast(t('game.notifications.partnerSubmittedResponse'));
        if (action.action_data) {
          window.dispatchEvent(new CustomEvent('partnerResponse', {
            detail: {
              response: action.action_data.response,
              responseTime: action.action_data.responseTime,
              question: action.action_data.question,
              from: action.action_data.from
            }
          }));
        }
        break;
      case 'evaluation_submit':
        showToast(t('game.notifications.evaluationCompleted'));
        if (action.action_data?.nextCard) {
          setTimeout(() => showToast(t('game.notifications.newCardAvailable')), 500);
        }
        break;
      case 'turn_advance':
        // Reduce frequency of turn advance notifications
        break;
      case 'level_change':
        showToast(t('game.notifications.levelChanged', { level: action.action_data.level }), 'success');
        break;
      case 'game_finish':
        window.dispatchEvent(new CustomEvent('gameFinish', {
          detail: action.action_data
        }));
        break;
      case 'change_level_request':
        showToast(t('game.notifications.partnerWantsLevelChange'));
        window.dispatchEvent(new CustomEvent('changeLevelRequest', {
          detail: action.action_data
        }));
        break;
      case 'level_mismatch':
        showToast(t('game.notifications.differentLevelsSelected'), 'error');
        break;
      case 'level_change_request':
        showToast(t('game.notifications.choosingNewLevel'));
        
        console.log('🔄 Level change request - resetting game state');
        
        // Clear existing level selection votes for fresh start
        await supabase
          .from('level_selection_votes')
          .delete()
          .eq('room_id', action.room_id);
        
        // Reset room phase to level selection AND clear card state
        await supabase
          .from('game_rooms')
          .update({ 
            current_phase: 'level-select',
            current_card: null,
            used_cards: [],
            current_card_index: 0
          })
          .eq('id', action.room_id);
        
        console.log('✅ Game state reset: current_card=null, used_cards=[]');
        
        // Navigate both players to level selection
        window.location.href = `/level-select?room=${action.action_data.roomCode}`;
        break;
    }
  };

  const syncAction = useCallback(async (action_type: GameSyncAction['action_type'], action_data: any) => {
    if (!roomId) {
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('game_sync')
        .insert({
          room_id: roomId,
          action_type,
          action_data,
          triggered_by: playerId
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast.error(t('game.notifications.actionSyncError'));
    } finally {
      setIsLoading(false);
    }
  }, [roomId, playerId]);

  const updateGameState = useCallback(async (updates: Partial<GameState>) => {
    if (!roomId) {
      return;
    }

    try {
      setIsLoading(true);

      // Prepare update object, filtering out undefined values
      const updateData: any = {};
      if (updates.current_phase !== undefined) updateData.current_phase = updates.current_phase;
      if (updates.proximity_question_answered !== undefined) updateData.proximity_question_answered = updates.proximity_question_answered;
      if (updates.proximity_response !== undefined) updateData.proximity_response = updates.proximity_response;
      if (updates.current_turn !== undefined) updateData.current_turn = updates.current_turn;
      if (updates.current_card !== undefined) updateData.current_card = updates.current_card;
      if (updates.current_card_index !== undefined) updateData.current_card_index = updates.current_card_index;
      if (updates.used_cards !== undefined) updateData.used_cards = updates.used_cards;

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', roomId);

      if (error) {
        throw error;
      }

      // Update local state
      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  return {
    gameState,
    syncAction,
    updateGameState,
    isLoading
  };
};

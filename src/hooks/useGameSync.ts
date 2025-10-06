import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { useGameQueueProcessor } from './useGameQueueProcessor';

interface GameSyncAction {
  id: string;
  room_id: string;
  action_type: 'proximity_answer' | 'card_reveal' | 'response_submit' | 'evaluation_submit' | 'evaluation_complete' | 'level_change' | 'navigate_to_level_select' | 'turn_advance' | 'game_finish' | 'change_level_request' | 'level_mismatch' | 'level_change_request';
  action_data: any;
  triggered_by: string;
  created_at: string;
}

interface GameState {
  current_phase: 'proximity-selection' | 'card-display' | 'response-input' | 'evaluation' | 'level-selection' | 'waiting-for-evaluation';
  proximity_question_answered: boolean;
  player1_proximity_response: boolean | null;
  player2_proximity_response: boolean | null;
  current_turn: 'player1' | 'player2';
  current_card: string | null;
  current_card_index: number;
  used_cards: string[];
  selected_language?: string;
}

interface UseGameSyncReturn {
  gameState: GameState | null;
  syncAction: (action_type: GameSyncAction['action_type'], action_data: any) => Promise<void>;
  updateGameState: (updates: Partial<GameState>) => Promise<void>;
  isLoading: boolean;
}

export const useGameSync = (roomId: string | null, playerId: string, playerNumber?: number): UseGameSyncReturn => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, i18n } = useTranslation();
  
  // Initialize queue processor for this room
  useGameQueueProcessor(roomId);

  logger.debug('useGameSync language', { language: i18n.language });

  // Load initial game state
  useEffect(() => {
    if (!roomId) return;

    const loadGameState = async () => {
      try {
        const { data: room, error } = await supabase
          .from('game_rooms')
          .select('current_phase, proximity_question_answered, player1_proximity_response, player2_proximity_response, current_turn, current_card, current_card_index, used_cards, selected_language')
          .eq('id', roomId)
          .single();

        if (error) throw error;

        if (room) {
          setGameState({
            current_phase: (room.current_phase as GameState['current_phase']) || 'proximity-selection',
            proximity_question_answered: room.proximity_question_answered || false,
            player1_proximity_response: room.player1_proximity_response,
            player2_proximity_response: room.player2_proximity_response,
            current_turn: (room.current_turn as GameState['current_turn']) || 'player1',
            current_card: room.current_card,
            current_card_index: room.current_card_index || 0,
            used_cards: room.used_cards || [],
            selected_language: room.selected_language || undefined
          });
        }
      } catch (error) {
        // Silent error handling for game state loading
      }
    };

    loadGameState();
  }, [roomId]);

  // Enhanced real-time game sync with connection monitoring
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
          
          // Process all actions but show different feedback for own vs partner actions
          const isOwnAction = action.triggered_by === playerId;
          logger.debug('Received game sync action', { 
            action: action.action_type, 
            triggeredBy: action.triggered_by, 
            isOwnAction,
            playerId 
          });

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
          
          // PHASE 1 FIX: Add null check to prevent "Cannot read properties of null" error
          if (!updatedRoom) {
            logger.warn('⚠️ Received null updated room payload, skipping state update.');
            return;
          }
          
          logger.debug('Room state updated', { updatedRoom });
          
          setGameState({
            current_phase: (updatedRoom.current_phase as GameState['current_phase']) || 'proximity-selection',
            proximity_question_answered: updatedRoom.proximity_question_answered || false,
            player1_proximity_response: updatedRoom.player1_proximity_response,
            player2_proximity_response: updatedRoom.player2_proximity_response,
            current_turn: (updatedRoom.current_turn as GameState['current_turn']) || 'player1',
            current_card: updatedRoom.current_card,
            current_card_index: updatedRoom.current_card_index || 0,
            used_cards: updatedRoom.used_cards || [],
            selected_language: updatedRoom.selected_language
          });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        logger.debug('Presence sync - checking connection state');
      })
      .subscribe((status) => {
        logger.debug('Channel subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          // Update connection state when successfully subscribed
          syncConnectionState();
        }
      });

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 100);
    };
  }, [roomId, playerId]);

  // Connection state sync function
  const syncConnectionState = useCallback(async () => {
    if (!roomId || !playerId) return;
    
    try {
      await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });
      logger.debug('Connection state synced');
    } catch (error) {
      logger.warn('Failed to sync connection state:', error);
    }
  }, [roomId, playerId]);

  const handleSyncAction = useCallback(async (action: GameSyncAction) => {
    // Add debouncing to prevent rapid successive updates
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
      }, 150);
    };

    switch (action.action_type) {
      case 'proximity_answer':
        if (action.action_data?.singlePlayerAdvancement) {
          showToast(t('game.notifications.proximitySelectedAdvancing'), 'success');
        } else {
          showToast(t('game.notifications.partnerAnswered'), 'success');
        }
        
        // Always force refresh of game state after proximity answer
        if (action.room_id) {
          const { data: room, error } = await supabase
            .from('game_rooms')
            .select('current_phase, proximity_question_answered, player1_proximity_response, player2_proximity_response, current_turn, current_card, current_card_index, used_cards, selected_language')
            .eq('id', action.room_id)
            .single();
          
          if (!error && room) {
            setGameState({
              current_phase: (room.current_phase as GameState['current_phase']) || 'proximity-selection',
              proximity_question_answered: room.proximity_question_answered || false,
              player1_proximity_response: room.player1_proximity_response,
              player2_proximity_response: room.player2_proximity_response,
              current_turn: (room.current_turn as GameState['current_turn']) || 'player1',
              current_card: room.current_card,
              current_card_index: room.current_card_index || 0,
              used_cards: room.used_cards || [],
              selected_language: room.selected_language || undefined
            });
          }
        }
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
        // Enhanced evaluation feedback - notify the original responder
        const isMyResponse = action.action_data?.responding_player_id === playerId;
        
        if (isMyResponse) {
          showToast(t('game.notifications.yourResponseWasEvaluated'), 'success');
          
          // Dispatch detailed evaluation event for the responder
          window.dispatchEvent(new CustomEvent('evaluationReceived', {
            detail: {
              evaluation: action.action_data.evaluation,
              question: action.action_data.question,
              response: action.action_data.response,
              evaluator: action.action_data.evaluation_by,
              round: action.action_data.round_number
            }
          }));
        } else {
          showToast(t('game.notifications.evaluationCompleted'));
        }
        
        if (action.action_data?.nextCard) {
          setTimeout(() => showToast(t('game.notifications.newCardAvailable')), 500);
        }
        break;

      case 'evaluation_complete':
        logger.info('Received evaluation_complete sync event', {
          action,
          playerNumber,
          nextPlayerNumber: action.action_data?.next_player_number
        });
        
        // Database trigger v5 has advanced the game automatically
        const nextPlayerNumber = action.action_data?.next_player_number;
        const isMyNextTurn = (playerNumber === nextPlayerNumber);
        
        logger.info('Processing evaluation completion', {
          nextPlayerNumber,
          isMyNextTurn,
          totalEvaluations: action.action_data?.total_evaluations,
          gameFinished: action.action_data?.game_finished
        });
        
        // HARD SYNC: Force fetch latest room state immediately after evaluation
        if (action.room_id) {
          const { data: room, error } = await supabase
            .from('game_rooms')
            .select('current_phase, current_turn, current_card, current_card_index, used_cards')
            .eq('id', action.room_id)
            .single();
          
          if (!error && room) {
            setGameState(prev => prev ? {
              ...prev,
              current_phase: (room.current_phase as GameState['current_phase']) || 'card-display',
              current_turn: (room.current_turn as GameState['current_turn']) || 'player1',
              current_card: room.current_card,
              current_card_index: room.current_card_index || 0,
              used_cards: room.used_cards || []
            } : null);
            
            logger.info('Hard synced game state after evaluation completion', { room });
          }
        }
        
        // Create processing event to show 3-second transition
        window.dispatchEvent(new CustomEvent('evaluationProcessing', {
          detail: {
            nextPlayerNumber,
            isMyNextTurn,
            totalEvaluations: action.action_data?.total_evaluations || 0,
            gameFinished: action.action_data?.game_finished || false
          }
        }));
        
        // Show feedback after 3-second delay
        setTimeout(() => {
          if (isMyNextTurn) {
            showToast(t('game.notifications.yourTurn'), 'success');
          } else {
            showToast(t('game.notifications.waitingForPlayer'));
          }
        }, 3000);
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
        
        logger.info('Level change request - resetting game state');
        
        // Clear existing level selection votes for fresh start
        await supabase
          .from('level_selection_votes')
          .delete()
          .eq('room_id', action.room_id);
        
        // Reset room phase to level selection AND clear card state
        await supabase
          .from('game_rooms')
          .update({ 
            current_phase: 'level-selection',
            current_card: null,
            used_cards: [],
            current_card_index: 0
          })
          .eq('id', action.room_id);
        
        logger.info('Game state reset: current_card=null, used_cards=[]');
        
        // Navigate both players to level selection
        window.location.href = `/level-select?room=${action.action_data.roomCode}`;
        break;
    }
  }, [roomId, playerId, playerNumber, t]);

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
      if (updates.player1_proximity_response !== undefined) updateData.player1_proximity_response = updates.player1_proximity_response;
      if (updates.player2_proximity_response !== undefined) updateData.player2_proximity_response = updates.player2_proximity_response;
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

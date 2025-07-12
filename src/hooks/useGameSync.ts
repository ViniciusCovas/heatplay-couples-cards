import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameSyncAction {
  id: string;
  room_id: string;
  action_type: 'proximity_answer' | 'card_reveal' | 'response_submit' | 'evaluation_submit' | 'level_change' | 'navigate_to_level_select';
  action_data: any;
  triggered_by: string;
  created_at: string;
}

interface GameState {
  current_phase: 'proximity-selection' | 'card-display' | 'response-input' | 'evaluation' | 'level-select';
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
        console.error('Error loading game state:', error);
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

  const handleSyncAction = (action: GameSyncAction) => {
    switch (action.action_type) {
      case 'proximity_answer':
        toast.success('Tu pareja respondió la pregunta de proximidad');
        break;
      case 'navigate_to_level_select':
        toast.success('Navegando a selección de niveles...');
        // The navigation will happen via state change
        break;
      case 'card_reveal':
        toast.info('Nueva carta revelada');
        break;
      case 'response_submit':
        toast.info('Tu pareja envió su respuesta');
        break;
      case 'evaluation_submit':
        toast.info('Evaluación completada');
        break;
      case 'level_change':
        toast.success(`Nivel cambiado a ${action.action_data.level}`);
        break;
    }
  };

  const syncAction = useCallback(async (action_type: GameSyncAction['action_type'], action_data: any) => {
    if (!roomId) return;

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

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing action:', error);
      toast.error('Error sincronizando la acción');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, playerId]);

  const updateGameState = useCallback(async (updates: Partial<GameState>) => {
    if (!roomId) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('game_rooms')
        .update({
          current_phase: updates.current_phase,
          proximity_question_answered: updates.proximity_question_answered,
          proximity_response: updates.proximity_response,
          current_turn: updates.current_turn,
          current_card: updates.current_card,
          current_card_index: updates.current_card_index,
          used_cards: updates.used_cards
        })
        .eq('id', roomId);

      if (error) throw error;

      // Update local state
      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating game state:', error);
      toast.error('Error actualizando el estado del juego');
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
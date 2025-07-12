import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameSyncAction {
  id: string;
  room_id: string;
  action_type: 'proximity_answer' | 'card_reveal' | 'response_submit' | 'evaluation_submit' | 'level_change' | 'navigate_to_level_select' | 'turn_advance';
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
        break;
      case 'card_reveal':
        toast.info('Nueva carta revelada');
        break;
      case 'response_submit':
        toast.info('Tu pareja envió su respuesta');
        // Aquí podemos actualizar el estado local con la respuesta del partner
        break;
      case 'evaluation_submit':
        toast.info('Evaluación completada');
        break;
      case 'turn_advance':
        toast.info('Turno avanzado');
        break;
      case 'level_change':
        toast.success(`Nivel cambiado a ${action.action_data.level}`);
        break;
    }
  };

  const syncAction = useCallback(async (action_type: GameSyncAction['action_type'], action_data: any) => {
    console.log('🚀 syncAction called:', { action_type, action_data, roomId, playerId });
    
    if (!roomId) {
      console.log('❌ syncAction: No roomId');
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
        console.error('❌ syncAction database error:', error);
        throw error;
      }
      
      console.log('✅ syncAction completed successfully');
    } catch (error) {
      console.error('❌ Error syncing action:', error);
      toast.error('Error sincronizando la acción');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, playerId]);

  const updateGameState = useCallback(async (updates: Partial<GameState>) => {
    console.log('🔄 updateGameState called:', { updates, roomId });
    
    if (!roomId) {
      console.log('❌ updateGameState: No roomId');
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

      console.log('📝 Updating database with:', updateData);

      const { data, error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', roomId)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Database updated successfully:', data);

      // Update local state
      setGameState(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('❌ Error updating game state:', error);
      throw error; // Re-throw to let caller handle it
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
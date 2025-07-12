import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LevelVote {
  id: string;
  room_id: string;
  player_id: string;
  selected_level: number;
  created_at: string;
}

interface UseLevelSelectionReturn {
  submitLevelVote: (level: number) => Promise<void>;
  votes: LevelVote[];
  isWaitingForPartner: boolean;
  agreedLevel: number | null;
  hasVoted: boolean;
}

export const useLevelSelection = (roomId: string | null, playerId: string): UseLevelSelectionReturn => {
  const [votes, setVotes] = useState<LevelVote[]>([]);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [agreedLevel, setAgreedLevel] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Load existing votes
  useEffect(() => {
    if (!roomId) return;

    const loadVotes = async () => {
      try {
        const { data, error } = await supabase
          .from('level_selection_votes')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          console.log('📊 Loaded votes:', data);
          setVotes(data);
          
          // Check if current player has voted
          const playerVote = data.find(v => v.player_id === playerId);
          setHasVoted(!!playerVote);
          console.log('🗳️ Player has voted:', !!playerVote);

          // Check if there are 2 votes and they match
          if (data.length >= 2) {
            console.log('🔍 Checking votes for match, total votes:', data.length);
            const uniquePlayerVotes = new Map();
            data.forEach(vote => {
              uniquePlayerVotes.set(vote.player_id, vote);
            });
            
            const latestVotes = Array.from(uniquePlayerVotes.values());
            console.log('👥 Unique player votes:', latestVotes);
            
            if (latestVotes.length === 2) {
              const levels = latestVotes.map(v => v.selected_level);
              console.log('🎯 Comparing levels:', levels);
              
              if (levels[0] === levels[1]) {
                console.log('✅ LEVELS MATCH! Setting agreed level:', levels[0]);
                setAgreedLevel(levels[0]);
                setIsWaitingForPartner(false);
                
                // Update game room to proceed to next phase
                await supabase
                  .from('game_rooms')
                  .update({ 
                    level: levels[0],
                    current_phase: 'proximity-selection' 
                  })
                  .eq('id', roomId);
                  
                console.log('✅ Both players agreed on level', levels[0]);
                  
              } else {
                // Levels don't match, reset votes and ask to vote again
                await supabase
                  .from('level_selection_votes')
                  .delete()
                  .eq('room_id', roomId);
                
                setVotes([]);
                setHasVoted(false);
                setIsWaitingForPartner(false);
                
                toast.error('Los niveles no coinciden. Por favor, vuelvan a elegir.');
              }
            }
          } else if (data.length === 1) {
            const playerVote = data.find(v => v.player_id === playerId);
            if (playerVote) {
              setIsWaitingForPartner(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading votes:', error);
      }
    };

    loadVotes();
  }, [roomId, playerId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`level-votes-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'level_selection_votes',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newVote = payload.new as LevelVote;
          
          // Don't process our own votes
          if (newVote.player_id === playerId) return;

          setVotes(prev => {
            const updated = [newVote, ...prev.filter(v => v.player_id !== newVote.player_id)];
            
            // Check if we now have matching votes from both players
            const uniquePlayerVotes = new Map();
            updated.forEach(vote => {
              uniquePlayerVotes.set(vote.player_id, vote);
            });
            
            const latestVotes = Array.from(uniquePlayerVotes.values());
            
            if (latestVotes.length === 2) {
              const levels = latestVotes.map(v => v.selected_level);
              
              if (levels[0] === levels[1]) {
                setAgreedLevel(levels[0]);
                setIsWaitingForPartner(false);
                toast.success(`¡Perfecto! Ambos eligieron el nivel ${levels[0]}`);
                
                console.log('✅ Real-time: Both players agreed on level', levels[0]);
                
                // Update game room to proceed to next phase
                supabase
                  .from('game_rooms')
                  .update({ 
                    level: levels[0],
                    current_phase: 'proximity-selection' 
                  })
                  .eq('id', roomId)
                  .then(() => {
                    console.log('✅ Game room updated to proximity-selection phase');
                  });
              } else {
                // Levels don't match
                toast.error('Los niveles no coinciden. Por favor, vuelvan a elegir.');
              }
            } else {
              setIsWaitingForPartner(true);
            }
            
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  const submitLevelVote = useCallback(async (level: number) => {
    console.log('🗳️ submitLevelVote called:', { level, roomId, playerId });
    
    if (!roomId) {
      console.error('❌ No roomId provided');
      toast.error('Error: No hay sala activa');
      return;
    }

    if (!playerId) {
      console.error('❌ No playerId provided');
      toast.error('Error: No hay jugador identificado');
      return;
    }

    try {
      console.log('🔄 Deleting existing votes...');
      // Delete any existing vote from this player
      const { error: deleteError } = await supabase
        .from('level_selection_votes')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId);

      if (deleteError) {
        console.error('❌ Error deleting existing votes:', deleteError);
      }

      console.log('✅ Inserting new vote...');
      // Insert new vote
      const { data, error } = await supabase
        .from('level_selection_votes')
        .insert({
          room_id: roomId,
          player_id: playerId,
          selected_level: level
        })
        .select();

      if (error) {
        console.error('❌ Error inserting vote:', error);
        throw error;
      }

      console.log('✅ Vote inserted successfully:', data);

      setHasVoted(true);
      setIsWaitingForPartner(true);
      
      toast.success(`Has elegido el nivel ${level}. Esperando a tu pareja...`);
    } catch (error) {
      console.error('❌ Error submitting vote:', error);
      toast.error('Error al enviar tu voto');
    }
  }, [roomId, playerId]);

  return {
    submitLevelVote,
    votes,
    isWaitingForPartner,
    agreedLevel,
    hasVoted
  };
};
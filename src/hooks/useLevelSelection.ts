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
  selectedLevel: number | null;
}

export const useLevelSelection = (roomId: string | null, playerId: string): UseLevelSelectionReturn => {
  const [votes, setVotes] = useState<LevelVote[]>([]);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [agreedLevel, setAgreedLevel] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Helper function to check for matching votes
  const checkForMatchingVotes = useCallback(async (allVotes: LevelVote[]) => {
    console.log('🔍 checkForMatchingVotes called', { 
      roomId, 
      playerId, 
      votesLength: allVotes.length,
      votes: allVotes 
    });
    
    if (!roomId) {
      console.error('❌ No roomId in checkForMatchingVotes');
      return;
    }
    
    if (allVotes.length >= 2) {
      console.log('🔍 Checking for matching votes with', allVotes.length, 'total votes');
      
      // Get unique votes per player (latest vote wins)
      const uniquePlayerVotes = new Map();
      allVotes.forEach(vote => {
        const existing = uniquePlayerVotes.get(vote.player_id);
        if (!existing || new Date(vote.created_at) > new Date(existing.created_at)) {
          uniquePlayerVotes.set(vote.player_id, vote);
        }
      });
      
      const latestVotes = Array.from(uniquePlayerVotes.values());
      console.log('👥 Unique player votes:', latestVotes);
      
      if (latestVotes.length === 2) {
        const levels = latestVotes.map(v => v.selected_level);
        console.log('🎯 Comparing levels:', levels);
        
        if (levels[0] === levels[1]) {
          console.log('✅ LEVELS MATCH! Advancing to next phase');
          console.log('🎯 About to update room:', roomId, 'with level:', levels[0]);
          
          setAgreedLevel(levels[0]);
          setIsWaitingForPartner(false);
          toast.success(`¡Perfecto! Ambos eligieron el nivel ${levels[0]}`);
          
          // Update game room with error handling
          try {
            console.log('🔄 Starting game room update...');
            const { data: updateData, error: updateError } = await supabase
              .from('game_rooms')
              .update({ 
                level: levels[0],
                current_phase: 'card-display' 
              })
              .eq('id', roomId)
              .select();
              
            console.log('📊 Update result:', { updateData, updateError });
              
            if (updateError) {
              console.error('❌ Error updating game room:', updateError);
              toast.error('Error al avanzar. Intenta nuevamente.');
            } else {
              console.log('✅ Game room successfully updated to proximity-selection');
              console.log('📊 Updated data:', updateData);
            }
          } catch (err) {
            console.error('❌ Exception updating game room:', err);
            toast.error('Error al avanzar. Intenta nuevamente.');
          }
        } else {
          console.log('❌ Levels do not match:', levels);
          toast.error('Los niveles no coinciden. Por favor, vuelvan a elegir.');
          setIsWaitingForPartner(false);
          setHasVoted(false);
          setSelectedLevel(null);
          setAgreedLevel(null);
          
          // Clear mismatched votes
          try {
            await supabase
              .from('level_selection_votes')
              .delete()
              .eq('room_id', roomId);
            console.log('🗑️ Cleared mismatched votes');
          } catch (err) {
            console.error('❌ Error clearing votes:', err);
          }
        }
      } else if (latestVotes.length === 1) {
        console.log('🔄 Only one player has voted');
        const playerVote = latestVotes.find(v => v.player_id === playerId);
        if (playerVote) {
          console.log('🕐 Current player voted, waiting for partner');
          setIsWaitingForPartner(true);
        }
      }
    } else {
      console.log('🔄 Not enough votes yet:', allVotes.length);
    }
  }, [roomId, playerId]);

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
          
          // Check if current player has voted and set selected level
          const playerVote = data.find(v => v.player_id === playerId);
          setHasVoted(!!playerVote);
          setSelectedLevel(playerVote ? playerVote.selected_level : null);
          console.log('🗳️ Player has voted:', !!playerVote, 'Level:', playerVote?.selected_level);

          // Check for matching votes
          await checkForMatchingVotes(data);
        }
      } catch (error) {
        console.error('Error loading votes:', error);
      }
    };

    loadVotes();
  }, [roomId, playerId, checkForMatchingVotes]);

  // Force re-evaluation on mount in case votes are already there
  useEffect(() => {
    if (!roomId) return;
    
    const forceReEvaluation = async () => {
      console.log('🔄 Force re-evaluation on mount');
      const { data: currentVotes, error } = await supabase
        .from('level_selection_votes')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
        
      if (!error && currentVotes) {
        console.log('🔄 Current votes for force evaluation:', currentVotes);
        await checkForMatchingVotes(currentVotes);
      }
    };
    
    // Add a small delay to ensure state is ready
    const timer = setTimeout(forceReEvaluation, 1000);
    return () => clearTimeout(timer);
  }, [roomId, checkForMatchingVotes]);

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
        async (payload) => {
          console.log('📨 Real-time vote received:', payload);
          
          // Process all votes (including own) to ensure consistency
          const newVote = payload.new as LevelVote;
          
          // Re-fetch all votes to ensure we have the latest state
          const { data: allVotes, error } = await supabase
            .from('level_selection_votes')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching votes in real-time:', error);
            return;
          }

          console.log('🔄 Re-fetched all votes:', allVotes);
          
          if (allVotes) {
            setVotes(allVotes);
            
            // Check player vote status and update selected level
            const playerVote = allVotes.find(v => v.player_id === playerId);
            setHasVoted(!!playerVote);
            setSelectedLevel(playerVote ? playerVote.selected_level : null);
            
            // Check for matching votes
            await checkForMatchingVotes(allVotes);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, checkForMatchingVotes]);

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
      setSelectedLevel(level);
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
    hasVoted,
    selectedLevel
  };
};
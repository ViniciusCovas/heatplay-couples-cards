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
  countdown: number | null;
  bothPlayersVoted: boolean;
  forceSync: () => Promise<void>;
  levelsMismatch: boolean;
  tryAgain: () => Promise<void>;
}

export const useLevelSelection = (roomId: string | null, playerId: string): UseLevelSelectionReturn => {
  const [votes, setVotes] = useState<LevelVote[]>([]);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [agreedLevel, setAgreedLevel] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [bothPlayersVoted, setBothPlayersVoted] = useState(false);
  const [levelsMismatch, setLevelsMismatch] = useState(false);

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
        setBothPlayersVoted(true);
        const levels = latestVotes.map(v => v.selected_level);
        console.log('🎯 Comparing levels:', levels);
        
        if (levels[0] === levels[1]) {
          console.log('✅ LEVELS MATCH! Starting countdown...');
          
          if (!agreedLevel) { // Only start countdown if not already agreed
            setCountdown(10);
            toast.success(`¡Perfecto! Ambos eligieron el nivel ${levels[0]}. Iniciando en 10 segundos...`);
            
            // Start countdown
            let timeLeft = 10;
            const countdownInterval = setInterval(() => {
              timeLeft--;
              setCountdown(timeLeft);
              
              if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                setAgreedLevel(levels[0]);
                setIsWaitingForPartner(false);
                setCountdown(null);
                
                // Force update game room
                const updateRoom = async () => {
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
                      console.log('✅ Game room successfully updated to card-display');
                      console.log('📊 Updated data:', updateData);
                    }
                  } catch (err) {
                    console.error('❌ Exception updating game room:', err);
                    toast.error('Error al avanzar. Intenta nuevamente.');
                  }
                };
                
                updateRoom();
              }
            }, 1000);
          }
        } else {
          console.log('❌ MISMATCH DETECTED! Levels do not match:', levels);
          console.log('🔍 Player 1 level:', levels[0], 'Player 2 level:', levels[1]);
          
          // Set mismatch state immediately
          setLevelsMismatch(true);
          setCountdown(null);
          setIsWaitingForPartner(false);
          setBothPlayersVoted(true); // Keep this true to show mismatch UI
          
          toast.error('You selected different levels. You must select the same level to play.');
          
          // Use game_sync to coordinate mismatch state between players
          try {
            await supabase
              .from('game_sync')
              .insert({
                room_id: roomId,
                action_type: 'level_mismatch',
                action_data: { 
                  levels, 
                  player_votes: latestVotes.map(v => ({ player_id: v.player_id, level: v.selected_level }))
                },
                triggered_by: playerId
              });
          } catch (error) {
            console.error('❌ Error syncing mismatch state:', error);
          }
          
          // Automatically reset after 4 seconds to allow reselection
          setTimeout(async () => {
            console.log('🔄 Auto-resetting after level mismatch');
            try {
              // Clear all votes for this room
              await supabase
                .from('level_selection_votes')
                .delete()
                .eq('room_id', roomId);
              
              // Sync reset action
              await supabase
                .from('game_sync')
                .insert({
                  room_id: roomId,
                  action_type: 'reset_votes',
                  action_data: { reason: 'level_mismatch_auto_reset' },
                  triggered_by: playerId
                });
              
              // Reset states
              setVotes([]);
              setBothPlayersVoted(false);
              setLevelsMismatch(false);
              setHasVoted(false);
              setSelectedLevel(null);
              setAgreedLevel(null);
              setIsWaitingForPartner(false);
              setCountdown(null);
              
              toast.info('Ready to select again!');
            } catch (error) {
              console.error('❌ Error in auto-reset:', error);
            }
          }, 4000);
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

  // Listen for real-time updates - votes and sync actions
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
          console.log('📨 New vote details:', newVote);
          
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

          console.log('🔄 Re-fetched all votes for real-time:', allVotes);
          
          if (allVotes) {
            setVotes(allVotes);
            
            // Check player vote status and update selected level
            const playerVote = allVotes.find(v => v.player_id === playerId);
            setHasVoted(!!playerVote);
            setSelectedLevel(playerVote ? playerVote.selected_level : null);
            
            // CRITICAL: Force check for matching votes
            console.log('🚨 FORCING CHECK FOR MATCHING VOTES...');
            await checkForMatchingVotes(allVotes);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_sync',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('📨 Real-time sync action received:', payload);
          const syncAction = payload.new as any;
          
          // Don't process our own sync actions
          if (syncAction.triggered_by === playerId) {
            console.log('🔄 Ignoring own sync action');
            return;
          }
          
          if (syncAction.action_type === 'level_mismatch') {
            console.log('📨 Processing level mismatch sync from partner');
            setLevelsMismatch(true);
            setCountdown(null);
            setIsWaitingForPartner(false);
            setBothPlayersVoted(true);
            toast.error('You selected different levels. You must select the same level to play.');
          } else if (syncAction.action_type === 'reset_votes') {
            console.log('📨 Processing vote reset sync from partner');
            setVotes([]);
            setBothPlayersVoted(false);
            setLevelsMismatch(false);
            setHasVoted(false);
            setSelectedLevel(null);
            setAgreedLevel(null);
            setIsWaitingForPartner(false);
            setCountdown(null);
            toast.info('Ready to select again!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, checkForMatchingVotes]);

  // Enhanced periodic verification with state recovery
  useEffect(() => {
    if (!roomId) return;
    
    const periodicCheck = async () => {
      try {
        // Check current room status
        const { data: room, error: roomError } = await supabase
          .from('game_rooms')
          .select('current_phase, level')
          .eq('id', roomId)
          .single();
        
        if (roomError) {
          console.error('❌ Error checking room status:', roomError);
          return;
        }
        
        console.log('🔄 Periodic check - Room state:', room);
        
        // STATE RECOVERY: If room is already in card-display but we're still waiting locally
        if (room?.current_phase === 'card-display' && !agreedLevel) {
          console.log('🚨 STATE RECOVERY: Room is in card-display but local state is waiting');
          setAgreedLevel(room.level);
          setIsWaitingForPartner(false);
          setCountdown(null);
          toast.success(`¡Recuperando estado! Iniciando nivel ${room.level}`);
          return;
        }
        
        // If room is still in level-select, check for matching votes
        if (room?.current_phase === 'level-select' && !agreedLevel) {
          const { data: allVotes, error: votesError } = await supabase
            .from('level_selection_votes')
            .select('*')
            .eq('room_id', roomId);
          
          if (!votesError && allVotes && allVotes.length >= 2) {
            const uniquePlayerVotes = new Map();
            allVotes.forEach(vote => {
              const existing = uniquePlayerVotes.get(vote.player_id);
              if (!existing || new Date(vote.created_at) > new Date(existing.created_at)) {
                uniquePlayerVotes.set(vote.player_id, vote);
              }
            });
            
            const latestVotes = Array.from(uniquePlayerVotes.values());
            if (latestVotes.length === 2) {
              const levels = latestVotes.map(v => v.selected_level);
              if (levels[0] === levels[1]) {
                console.log('🔄 PERIODIC CHECK: Found matching votes, forcing room update');
                
                // Force update the room
                await supabase
                  .from('game_rooms')
                  .update({ 
                    level: levels[0],
                    current_phase: 'card-display' 
                  })
                  .eq('id', roomId);
                
                setAgreedLevel(levels[0]);
                setIsWaitingForPartner(false);
                setCountdown(null);
                toast.success(`¡Niveles sincronizados! Iniciando nivel ${levels[0]}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in periodic check:', error);
      }
    };
    
    // Check immediately and then every 2 seconds for faster recovery
    periodicCheck();
    const interval = setInterval(periodicCheck, 2000);
    return () => clearInterval(interval);
  }, [roomId, agreedLevel]);

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

  // Try again function - clears votes and resets state
  const tryAgain = useCallback(async () => {
    if (!roomId) return;
    
    try {
      console.log('🔄 Try again triggered - clearing votes');
      toast.info('Clearing votes...');
      
      // Clear all votes for this room
      await supabase
        .from('level_selection_votes')
        .delete()
        .eq('room_id', roomId);
      
      // Reset states
      setVotes([]);
      setBothPlayersVoted(false);
      setLevelsMismatch(false);
      setHasVoted(false);
      setSelectedLevel(null);
      setAgreedLevel(null);
      setIsWaitingForPartner(false);
      setCountdown(null);
      
      toast.success('Ready to select again!');
    } catch (error) {
      console.error('❌ Error in try again:', error);
      toast.error('Error clearing votes');
    }
  }, [roomId]);

  // Manual sync function for stuck players
  const forceSync = useCallback(async () => {
    if (!roomId) return;
    
    try {
      console.log('🔄 Force sync triggered');
      toast.info('Sincronizando...');
      
      // Check room state
      const { data: room } = await supabase
        .from('game_rooms')
        .select('current_phase, level')
        .eq('id', roomId)
        .single();
      
      if (room?.current_phase === 'card-display') {
        setAgreedLevel(room.level);
        setIsWaitingForPartner(false);
        setCountdown(null);
        toast.success(`¡Sincronizado! Iniciando nivel ${room.level}`);
        return;
      }
      
      // Re-fetch and check votes
      const { data: allVotes } = await supabase
        .from('level_selection_votes')
        .select('*')
        .eq('room_id', roomId);
      
      if (allVotes) {
        setVotes(allVotes);
        const playerVote = allVotes.find(v => v.player_id === playerId);
        setHasVoted(!!playerVote);
        setSelectedLevel(playerVote ? playerVote.selected_level : null);
        await checkForMatchingVotes(allVotes);
      }
      
      toast.success('Estado sincronizado');
    } catch (error) {
      console.error('❌ Error in force sync:', error);
      toast.error('Error al sincronizar');
    }
  }, [roomId, playerId, checkForMatchingVotes]);

  return {
    submitLevelVote,
    votes,
    isWaitingForPartner,
    agreedLevel,
    hasVoted,
    selectedLevel,
    countdown,
    bothPlayersVoted,
    forceSync,
    levelsMismatch,
    tryAgain
  };
};
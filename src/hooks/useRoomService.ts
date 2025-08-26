import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { usePlayerId } from '@/hooks/usePlayerId';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';

export interface GameRoom {
  id: string;
  room_code: string;
  level: number;
  status: 'waiting' | 'playing' | 'finished';
  created_by?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  player_id: string;
  player_name?: string;
  is_ready: boolean;
  joined_at: string;
  last_activity: string;
  player_number: 1 | 2; // Added to clearly identify players
}

interface UseRoomServiceReturn {
  room: GameRoom | null;
  participants: RoomParticipant[];
  isConnected: boolean;
  playerNumber: 1 | 2 | null; // Added as stable state
  createRoom: (level: number, userId?: string) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  syncRoomState: (roomCode: string) => Promise<boolean>; // Added for creators
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  updateRoomStatus: (status: 'waiting' | 'playing' | 'finished') => Promise<void>;
  getPlayerNumber: () => 1 | 2 | null; // Keep for backwards compatibility
}

export const useRoomService = (): UseRoomServiceReturn => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const { playerId: localPlayerId, isReady: playerIdReady } = usePlayerId();
  const { i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();

  // Support hybrid authentication: authenticated users for room creation, anonymous users for joining
  const effectivePlayerId = user?.id || localPlayerId;
  const isPlayerReady = playerIdReady && !authLoading && !!effectivePlayerId;

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = useCallback(async (level: number, _userId?: string): Promise<string> => {
    console.log('🔧 createRoom called', { level, userId: user?.id, effectivePlayerId });
    
    if (!user?.id) {
      console.error('❌ createRoom called without authenticated user');
      throw new Error('You must be signed in to create a room.');
    }

    // Use atomic RPC to create room and join as player 1 with correct RLS context
    console.log('📞 Calling RPC: create_room_and_join...');
    const { data, error } = await supabase.rpc('create_room_and_join', {
      level_param: level,
      selected_language_param: i18n.language || 'en'
    });

    if (error) {
      console.error('❌ RPC create_room_and_join failed:', error);
      throw error;
    }

    const created = Array.isArray(data) ? data[0] : null;
    if (!created?.id || !created?.room_code) {
      console.error('❌ RPC returned invalid data:', data);
      throw new Error('Failed to create room. Please try again.');
    }

    console.log('✅ RPC room created:', created);

    // Fetch full room (ensures we have all fields)
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', created.id)
      .single();

    if (roomError || !roomData) {
      console.error('❌ Failed to load created room:', roomError);
      throw roomError || new Error('Failed to load created room.');
    }

    // Load participants (host should already be participant 1)
    const { data: participantsData } = await supabase
      .from('room_participants')
      .select('*, player_number')
      .eq('room_id', created.id);

    if (participantsData) {
      logger.debug('Initial participants after room creation', { participantsData });
      setParticipants(participantsData as RoomParticipant[]);
    }

    setRoom({
      id: roomData.id,
      room_code: roomData.room_code,
      level: roomData.level || 1,
      status: roomData.status as 'waiting' | 'playing' | 'finished',
      created_by: roomData.created_by || undefined,
      created_at: roomData.created_at,
      started_at: roomData.started_at || undefined,
      finished_at: roomData.finished_at || undefined
    });
    setIsConnected(true);

    return created.room_code;
  }, [user?.id, effectivePlayerId, i18n.language]);

  const joinRoom = useCallback(async (roomCode: string): Promise<boolean> => {
    logger.debug('Attempting to join room', { 
      roomCode, 
      effectivePlayerId, 
      isAuthenticated: !!user?.id, 
      playerIdReady, 
      authLoading,
      isPlayerReady 
    });

    // Wait briefly for player readiness if needed
    if (!isPlayerReady) {
      // Try refreshing session one time
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !effectivePlayerId) {
          logger.error('Player state not ready for room joining', { 
            effectivePlayerId, playerIdReady, authLoading, hasUser: !!user?.id 
          });
          throw new Error('player_not_ready');
        }
      } catch (err) {
        logger.error('Error refreshing session during join attempt', err);
        throw new Error('player_not_ready');
      }
    }
    
    try {
      // Special handling for test code
      if (roomCode === 'TEST123') {
        const testRoom: GameRoom = {
          id: 'test-room-id',
          room_code: 'TEST123',
          level: 1,
          status: 'playing',
          created_at: new Date().toISOString()
        };
        setRoom(testRoom);
        setIsConnected(true);
        return true;
      }

      // Use join_room_by_code RPC with retry logic
      console.log('🚀 Using join_room_by_code RPC for reliable joining...');
      
      const maxAttempts = 2;
      let attempt = 0;
      let joinResult: any = null;
      let rpcError: any = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        const res = await supabase.rpc('join_room_by_code', {
          room_code_param: roomCode,
          player_id_param: effectivePlayerId
        });
        joinResult = res.data;
        rpcError = res.error;
        
        if (rpcError) {
          logger.warn('RPC join_room_by_code attempt failed', { attempt, rpcError });
          await new Promise((r) => setTimeout(r, 150)); // small backoff
          continue;
        }
        break;
      }

      if (rpcError) {
        console.error('❌ RPC join_room_by_code failed after retries:', rpcError);
        return false;
      }

      if (!joinResult || typeof joinResult !== 'object' || !('success' in joinResult) || !joinResult.success) {
        const knownError = (joinResult && joinResult.error) ? joinResult.error : 'unknown';
        console.warn('❌ Room join unsuccessful:', joinResult);
        
        // Provide specific error messages for different scenarios
        if (knownError === 'room_full') {
          throw new Error('This room is already full. Only 2 players can join a room.');
        }
        if (knownError === 'room_not_found') {
          throw new Error('Room not found. Please check the room code.');
        }
        if (knownError === 'room_closed') {
          throw new Error('This room is no longer accepting new players.');
        }
        
        throw new Error(knownError);
      }

      console.log('✅ Successfully joined room via RPC:', joinResult);

      const roomId = (joinResult as any).room_id;
      if (!roomId) {
        console.error('❌ No room_id in join result');
        return false;
      }

      // Load full room data
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError || !roomData) {
        console.error('❌ Failed to load room data after join:', roomError);
        return false;
      }

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomId);

      if (participantsError) {
        console.warn('⚠️ Could not load participants after join:', participantsError);
      } else if (participantsData) {
        setParticipants(participantsData as RoomParticipant[]);
        logger.debug('Participants loaded after join', { participantsData });
      }

      // Set room state
      setRoom({
        id: roomData.id,
        room_code: roomData.room_code,
        level: roomData.level || 1,
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        created_by: roomData.created_by || undefined,
        created_at: roomData.created_at,
        started_at: roomData.started_at || undefined,
        finished_at: roomData.finished_at || undefined
      });
      setIsConnected(true);

      // Sync game state to ensure consistency
      await syncGameStateReliably(roomId, effectivePlayerId);

      return true;
    } catch (error: any) {
      // Allow callers to handle specific errors
      if (error?.message === 'room_full' || error?.message === 'room_not_found' || error?.message === 'player_not_ready') {
        throw error;
      }
      console.error('❌ Unexpected error joining room:', error);
      return false;
    }
  }, [effectivePlayerId, user?.id, isPlayerReady]);

  const syncRoomState = useCallback(async (roomCode: string): Promise<boolean> => {
    logger.debug('Syncing room state for creator', { roomCode, effectivePlayerId });

    if (!effectivePlayerId) {
      logger.error('No effective player ID for room state sync');
      return false;
    }

    try {
      // Find room by code that the user already participates in (any active status)
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .in('status', ['waiting', 'playing'])
        .single();

      if (roomError || !roomData) {
        logger.error('Failed to find room for sync', { 
          roomCode, 
          roomError, 
          message: 'Room not found or not in active status' 
        });
        return false;
      }

      logger.debug('Found room for sync', { 
        roomId: roomData.id, 
        status: roomData.status,
        roomCode 
      });

      // Verify user is already a participant
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('player_id', effectivePlayerId)
        .single();

      if (participantError || !participantData) {
        logger.error('User not found as participant in room', { 
          roomCode, 
          effectivePlayerId, 
          participantError,
          message: 'Creator not found in room participants' 
        });
        return false;
      }

      logger.debug('Creator verified as participant', { 
        participantId: participantData.id,
        playerNumber: participantData.player_number 
      });

      // Load all participants
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomData.id);

      if (allParticipantsError) {
        logger.warn('Could not load all participants during sync', allParticipantsError);
      } else if (allParticipants) {
        setParticipants(allParticipants as RoomParticipant[]);
        logger.debug('Participants synced', { allParticipants });
      }

      // Set room state
      setRoom({
        id: roomData.id,
        room_code: roomData.room_code,
        level: roomData.level || 1,
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        created_by: roomData.created_by || undefined,
        created_at: roomData.created_at,
        started_at: roomData.started_at || undefined,
        finished_at: roomData.finished_at || undefined
      });
      setIsConnected(true);

      logger.debug('Room state synced successfully', { 
        roomId: roomData.id, 
        status: roomData.status,
        participantsCount: allParticipants?.length || 0 
      });
      return true;
    } catch (error) {
      logger.error('Error syncing room state', error);
      return false;
    }
  }, [effectivePlayerId]);

  // Add reliable game state sync function
  const syncGameStateReliably = useCallback(async (roomId: string, playerId: string) => {
    try {
      const { data: syncResult, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) {
        console.warn('⚠️ Game state sync failed:', error);
        return;
      }

      logger.debug('✅ Game state synced reliably:', syncResult);
    } catch (error) {
      console.warn('⚠️ Game state sync error:', error);
    }
  }, []);

  const leaveRoom = useCallback(async (): Promise<void> => {
    try {
      if (room && effectivePlayerId) {
        await supabase
          .from('room_participants')
          .delete()
          .eq('room_id', room.id)
          .eq('player_id', effectivePlayerId);
      }

      if (channel) {
        await supabase.removeChannel(channel);
        setChannel(null);
      }

      setRoom(null);
      setParticipants([]);
      setPlayerNumber(null);
      setIsConnected(false);
    } catch (error) {
      // Silent error handling
    }
  }, [room, channel, effectivePlayerId]);

  const startGame = useCallback(async (): Promise<void> => {
    if (!room) return;

    try {
      await supabase
        .from('game_rooms')
        .update({ 
          status: 'playing',
          started_at: new Date().toISOString()
        })
        .eq('id', room.id);
    } catch (error) {
      // Silent error handling
    }
  }, [room]);

  const updateRoomStatus = useCallback(async (status: 'waiting' | 'playing' | 'finished'): Promise<void> => {
    if (!room) return;

    try {
      const updateData: any = { status };
      if (status === 'finished') {
        updateData.finished_at = new Date().toISOString();
      }

      await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', room.id);
    } catch (error) {
      // Silent error handling
    }
  }, [room]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase
      .channel(`room_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${room.id}`
        },
        async () => {
          // Refresh participants
          const { data } = await supabase
            .from('room_participants')
            .select('*, player_number')
            .eq('room_id', room.id);
          
          if (data) {
            logger.debug('Participants updated via realtime', { data });
            setParticipants(data as RoomParticipant[]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          const updatedRoom = payload.new as any;
          setRoom({
            ...updatedRoom,
            status: updatedRoom.status as 'waiting' | 'playing' | 'finished'
          });
        }
      )
      .subscribe();

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [room]);

  // Initial participants load
  useEffect(() => {
    if (!room) return;

    const loadParticipants = async () => {
      const { data } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', room.id);
      
      if (data) {
        logger.debug('Initial participants loaded', { data });
        setParticipants(data as RoomParticipant[]);
      }
    };

    loadParticipants();
  }, [room]);

  // Update playerNumber whenever participants change
  useEffect(() => {
    if (!effectivePlayerId || participants.length === 0) {
      setPlayerNumber(null);
      return;
    }
    
    const participant = participants.find(p => p.player_id === effectivePlayerId);
    const newPlayerNumber = participant?.player_number || null;
    
    logger.debug('Player number calculation', {
      effectivePlayerId,
      participants: participants.map(p => ({ id: p.player_id, number: p.player_number })),
      currentParticipant: participant,
      newPlayerNumber,
      oldPlayerNumber: playerNumber
    });
    
    if (newPlayerNumber !== playerNumber) {
      logger.debug('Player number updated', { from: playerNumber, to: newPlayerNumber });
      setPlayerNumber(newPlayerNumber);
    }
  }, [effectivePlayerId, participants, playerNumber]);

  const getPlayerNumber = useCallback((): 1 | 2 | null => {
    return playerNumber;
  }, [playerNumber]);

  return {
    room,
    participants,
    isConnected,
    playerNumber,
    createRoom,
    joinRoom,
    syncRoomState,
    leaveRoom,
    startGame,
    updateRoomStatus,
    getPlayerNumber
  };
};
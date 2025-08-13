
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
  player_number: number | null; // Matches database schema - can be null
}

interface JoinRoomByCodeResult {
  success: boolean;
  room_id?: string;
  player_number?: number;
  already_joined?: boolean;
  error?: string;
}

// Type guard to narrow RPC result safely
const isJoinRoomByCodeResult = (data: unknown): data is JoinRoomByCodeResult => {
  return !!data && typeof data === 'object' && 'success' in (data as any);
}

interface UseRoomServiceReturn {
  room: GameRoom | null;
  participants: RoomParticipant[];
  isConnected: boolean;
  playerNumber: 1 | 2 | null; // Added as stable state
  createRoom: (level: number, userId?: string) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<boolean>;
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
  const { playerId: localPlayerId, isLoading: isPlayerIdLoading } = usePlayerId();
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Support hybrid authentication: authenticated users for room creation, anonymous users for joining
  const effectivePlayerId = user?.id || localPlayerId;

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = useCallback(async (level: number, _userId?: string): Promise<string> => {
    logger.debug('🔧 createRoom called (ROOM CREATOR)', { level, userId: user?.id, effectivePlayerId });
    
    if (!user?.id) {
      console.error('❌ createRoom called without authenticated user');
      throw new Error('You must be signed in to create a room.');
    }

    // Use atomic RPC to create room and join as player 1 with correct RLS context
    logger.debug('📞 Calling RPC: create_room_and_join...');
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

    logger.debug('✅ RPC room created (ROOM CREATOR)', created);

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
      
      // Set player number for room creator (should be 1)
      const creatorParticipant = participantsData.find(p => p.player_id === user.id);
      if (creatorParticipant && (creatorParticipant.player_number === 1 || creatorParticipant.player_number === 2)) {
        setPlayerNumber(creatorParticipant.player_number as 1 | 2);
        logger.debug('🎯 Room creator player number set:', creatorParticipant.player_number);
      }
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
    logger.debug('🔗 Attempting to join room via RPC (ROOM JOINER)', { roomCode, effectivePlayerId, isAuthenticated: !!user?.id });

    if (!effectivePlayerId) {
      logger.error('Player ID not available for room join');
      throw new Error('Player ID not available');
    }

    try {
      // Allow local test code
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

      logger.debug('🚪 Calling join_room_by_code RPC...', { roomCode, effectivePlayerId });

      // 1) Use the secure RPC to find and join by code atomically
      const { data: rpcRaw, error: rpcError } = await supabase.rpc('join_room_by_code', {
        room_code_param: roomCode.trim().toUpperCase(),
        player_id_param: effectivePlayerId
      });

      if (rpcError) {
        logger.error('❌ RPC join_room_by_code failed:', rpcError);
        throw new Error(`Failed to join room: ${rpcError.message}`);
      }

      logger.debug('📥 RPC response received:', rpcRaw);

      if (!isJoinRoomByCodeResult(rpcRaw) || rpcRaw.success !== true) {
        const error = (rpcRaw as any)?.error || 'Unknown error';
        logger.warn('Join RPC unsuccessful:', { result: rpcRaw, error });
        
        if (error === 'room_not_found') {
          throw new Error('Room not found. Please check the room code.');
        } else if (error === 'room_full') {
          throw new Error('Room is full. Please try a different room.');
        } else if (error === 'room_closed') {
          throw new Error('Room is no longer accepting players.');
        }
        
        throw new Error('Failed to join room. Please try again.');
      }

      const joinedRoomId = rpcRaw.room_id as string;
      const assignedPlayerNumber = rpcRaw.player_number as number;
      const alreadyJoined = Boolean(rpcRaw.already_joined);

      logger.debug('✅ RPC join successful:', { 
        roomId: joinedRoomId, 
        playerNumber: assignedPlayerNumber, 
        alreadyJoined 
      });

      // If already joined, we don't need to re-fetch everything
      if (alreadyJoined) {
        logger.debug('⏭️ Already joined room, skipping expensive re-fetch');
        setPlayerNumber(assignedPlayerNumber as 1 | 2);
        return true;
      }

      // 2) Load the room details with comprehensive error handling and retry logic
      logger.debug('📡 Loading room details...');
      let roomData: any = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !roomData) {
        const { data, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', joinedRoomId)
          .maybeSingle();

        if (roomError) {
          logger.error(`❌ Failed to load room after join (attempt ${retryCount + 1}):`, roomError);
          if (retryCount === maxRetries - 1) {
            throw new Error(`Failed to load room details after ${maxRetries} attempts. Please try again.`);
          }
          retryCount++;
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          continue;
        }

        if (!data) {
          logger.error(`❌ Room not found after successful join (attempt ${retryCount + 1})`);
          if (retryCount === maxRetries - 1) {
            throw new Error('Room not found after joining. Please try again.');
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          continue;
        }

        roomData = data;
        logger.debug('✅ Room data loaded successfully:', roomData);
      }

      // 3) Load participants with retry logic
      logger.debug('👥 Loading participants...');
      let participantsData: any = null;
      retryCount = 0;
      
      while (retryCount < maxRetries) {
        const { data, error: participantsError } = await supabase
          .from('room_participants')
          .select('*, player_number')
          .eq('room_id', joinedRoomId);

        if (participantsError) {
          logger.warn(`⚠️ Could not load participants after join (attempt ${retryCount + 1}):`, participantsError);
          if (retryCount === maxRetries - 1) {
            logger.warn('⚠️ Max retries reached for participants, will use real-time updates');
            break;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          continue;
        } else if (data) {
          participantsData = data;
          logger.debug('👥 Participants loaded:', participantsData);
          setParticipants(participantsData as RoomParticipant[]);
          break;
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }

      // 4) Update local state
      const roomState: GameRoom = {
        id: roomData.id,
        room_code: roomData.room_code,
        level: roomData.level || 1,
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        created_by: roomData.created_by || undefined,
        created_at: roomData.created_at,
        started_at: roomData.started_at || undefined,
        finished_at: roomData.finished_at || undefined
      };

      setRoom(roomState);
      setIsConnected(true);

      // 5) Set player number
      if (assignedPlayerNumber === 1 || assignedPlayerNumber === 2) {
        setPlayerNumber(assignedPlayerNumber as 1 | 2);
        logger.debug('🎯 Player number assigned:', assignedPlayerNumber);
      } else if (alreadyJoined && participantsData) {
        // Derive from participants if we re-joined
        const me = participantsData.find((p: RoomParticipant) => p.player_id === effectivePlayerId);
        if (me && (me.player_number === 1 || me.player_number === 2)) {
          setPlayerNumber(me.player_number as 1 | 2);
          logger.debug('🎯 Player number derived from participants:', me.player_number);
        }
      }

      logger.debug('🎉 Room join completed successfully:', {
        roomCode: roomState.room_code,
        status: roomState.status,
        playerNumber: assignedPlayerNumber,
        participantCount: participantsData?.length || 0
      });

      return true;
    } catch (error) {
      logger.error('💥 Unexpected error joining room:', error);
      
      // Enhanced error logging for debugging
      if (error instanceof Error) {
        logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          roomCode,
          effectivePlayerId,
          isAuthenticated: !!user?.id
        });
        throw error; // Re-throw our custom errors with original message
      }
      
      // Log unknown error types
      logger.error('Unknown error type:', {
        error,
        type: typeof error,
        roomCode,
        effectivePlayerId
      });
      
      throw new Error('Unexpected error joining room. Please try again.');
    }
  }, [effectivePlayerId, user?.id]);

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
      logger.debug('🎮 Starting game - updating room status and phase', { roomId: room.id, roomCode: room.room_code });
      
      // Update room to playing status and proximity-selection phase in one atomic operation
      await supabase
        .from('game_rooms')
        .update({ 
          status: 'playing',
          current_phase: 'proximity-selection',
          started_at: new Date().toISOString()
        })
        .eq('id', room.id);
      
      logger.debug('✅ Game started successfully - room is now playing with proximity-selection phase');
    } catch (error) {
      logger.error('❌ Error starting game:', error);
      throw error; // Re-throw to handle in UI
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

    logger.debug('Setting up real-time subscriptions for room', { roomId: room.id, effectivePlayerId });

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
          logger.debug('Participants change detected via realtime');
          const { data, error } = await supabase
            .from('room_participants')
            .select('*, player_number')
            .eq('room_id', room.id);
          if (error) {
            logger.warn('Error refreshing participants via realtime', error);
            if (error.code === 'PGRST301' || error.code === '42501') {
              logger.debug('RLS permission error for anonymous user - using polling fallback');
            } else {
              setIsConnected(false);
            }
            setTimeout(() => {
              if (room) {
                logger.debug('Retrying participant refresh...');
                supabase
                  .from('room_participants')
                  .select('*, player_number')
                  .eq('room_id', room.id)
                  .then(({ data: retryData, error: retryError }) => {
                    if (retryData) {
                      setParticipants(retryData as RoomParticipant[]);
                      setIsConnected(true);
                      logger.debug('Participant refresh retry successful');
                    } else if (retryError) {
                      logger.debug('Participant refresh retry failed', retryError);
                    }
                  });
              }
            }, 2000);
          } else if (data) {
            logger.debug('Participants updated via realtime', { data });
            setParticipants(data as RoomParticipant[]);
            setIsConnected(true);
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
          logger.debug('Room update detected via realtime', payload);
          const updatedRoom = payload.new as any;
          setRoom({
            ...updatedRoom,
            status: updatedRoom.status as 'waiting' | 'playing' | 'finished'
          });
        }
      )
      .subscribe((status) => {
        logger.debug('Room channel subscription status', { status, roomId: room.id, effectivePlayerId });
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          logger.debug('Real-time subscription established successfully');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('Real-time subscription failed', { status, roomId: room.id });
          if (!user?.id) {
            logger.debug('Anonymous user subscription failed, will use polling fallback');
          } else {
            setIsConnected(false);
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    setChannel(roomChannel);

    const pollInterval = setInterval(async () => {
      if (!isConnected || !user?.id) {
        logger.debug('Polling for participants updates (fallback)', { 
          isConnected, 
          isAuthenticated: !!user?.id,
          roomId: room.id 
        });
        const { data, error } = await supabase
          .from('room_participants')
          .select('*, player_number')
          .eq('room_id', room.id);
        if (data && !error) {
          setParticipants(data as RoomParticipant[]);
          if (!isConnected) {
            logger.debug('Polling fallback successful - marking as connected');
            setIsConnected(true);
          }
        } else if (error) {
          logger.debug('Polling fallback failed', error);
        }
      }
    }, 3000);

    return () => {
      logger.debug('Cleaning up real-time subscriptions and polling');
      clearInterval(pollInterval);
      supabase.removeChannel(roomChannel);
    };
  }, [room, isConnected, user?.id, effectivePlayerId]);

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
    const newPlayerNumber = participant?.player_number as (1 | 2 | null) || null;
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
    leaveRoom,
    startGame,
    updateRoomStatus,
    getPlayerNumber
  };
};

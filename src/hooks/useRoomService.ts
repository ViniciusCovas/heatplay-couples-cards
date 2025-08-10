
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
  player_number: 1 | 2; // Añadido para identificar claramente los jugadores
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
  const localPlayerId = usePlayerId();
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Prefer the authenticated user id to satisfy RLS; fall back to legacy id as last resort
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
    // Must be authenticated to join due to RLS
    if (!user?.id) {
      console.warn('joinRoom called without authenticated user');
      return false;
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

      // Find the room - note: current RLS allows only hosts/participants to SELECT.
      // If the user isn't host/participant yet, this may return null due to policies.
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .in('status', ['waiting', 'playing'])
        .maybeSingle();

      if (roomError) {
        console.warn('Room lookup error (likely RLS if not participant/host):', roomError);
      }
      if (!roomData) {
        // As a fallback, attempt to join directly; if insert succeeds, we can then load data.
        console.log('Room not visible; attempting direct join insert with provided code (will fail if room doesn\'t exist)');
        // We can’t insert without room id, so bail out here until policies allow room discovery.
        return false;
      }

      // Load participants to check if user already in room (only visible if already a participant/host)
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomData.id);

      if (participantsError) {
        console.warn('Participants lookup error (likely RLS until joined):', participantsError);
      }

      const existing = (existingParticipants || []) as RoomParticipant[];
      const alreadyInRoom = existing.some(p => p.player_id === user.id);

      if (alreadyInRoom) {
        setParticipants(existing);
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
        return true;
      }

      // If we can see existing participants and it's already full
      if (existing && existing.length >= 2) {
        return false; // Room is full
      }

      // Join as player 2 using the authenticated user id to satisfy RLS
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          player_id: user.id,
          is_ready: true,
          player_number: 2
        });

      if (joinError) {
        console.error('❌ Join failed (RLS or constraints):', joinError);
        return false;
      }

      // Load participants after joining (now permitted by RLS)
      const { data: participantsData, error: loadParticipantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomData.id);

      if (loadParticipantsError) {
        console.warn('Could not load participants after join:', loadParticipantsError);
      } else if (participantsData) {
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
      return true;
    } catch (error) {
      console.error('Unexpected error joining room:', error);
      return false;
    }
  }, [user?.id]);

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
    leaveRoom,
    startGame,
    updateRoomStatus,
    getPlayerNumber
  };
};

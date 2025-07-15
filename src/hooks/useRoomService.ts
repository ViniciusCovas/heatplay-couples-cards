import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { usePlayerId } from '@/hooks/usePlayerId';

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
  createRoom: (level: number) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  updateRoomStatus: (status: 'waiting' | 'playing' | 'finished') => Promise<void>;
  getPlayerNumber: () => 1 | 2 | null; // Añadido para obtener el número del jugador actual
}

export const useRoomService = (): UseRoomServiceReturn => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const playerId = usePlayerId();

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = useCallback(async (level: number): Promise<string> => {
    try {
      const roomCode = generateRoomCode();
      
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          level,
          status: 'waiting',
          created_by: playerId
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          player_id: playerId,
          is_ready: true,
          player_number: 1 // El creador siempre es jugador 1
        });

      if (participantError) throw participantError;

      // Set the room state after successful creation
      setRoom({
        ...roomData,
        status: roomData.status as 'waiting' | 'playing' | 'finished'
      });
      setIsConnected(true);

      return roomCode;
    } catch (error) {
      throw error;
    }
  }, [playerId]);

  const joinRoom = useCallback(async (roomCode: string): Promise<boolean> => {
    if (!playerId) {
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

      // Find the room - accept both waiting and playing status
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .in('status', ['waiting', 'playing'])
        .single();

      if (roomError || !roomData) {
        return false;
      }

      // Check if player is already in the room
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomData.id);

      if (participantsError) throw participantsError;

      // Check if this player is already in the room
      const playerAlreadyInRoom = existingParticipants.some(p => p.player_id === playerId);
      
      if (playerAlreadyInRoom) {
        // Player already in room, just connect
        setParticipants(existingParticipants as RoomParticipant[]);
        setRoom({
          ...roomData,
          status: roomData.status as 'waiting' | 'playing' | 'finished'
        });
        setIsConnected(true);
        return true;
      }

      if (existingParticipants.length >= 2) {
        return false; // Room is full
      }

      // Join the room - el que se une siempre es jugador 2
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          player_id: playerId,
          is_ready: true,
          player_number: 2 // El que se une siempre es jugador 2
        });

      if (joinError) throw joinError;

      // Carga los participantes inmediatamente después de unirte a la sala
      const { data: participantsData, error: loadParticipantsError } = await supabase
        .from('room_participants')
        .select('*, player_number')
        .eq('room_id', roomData.id);

      if (loadParticipantsError) throw loadParticipantsError;
      if (participantsData) {
        setParticipants(participantsData as RoomParticipant[]);
      }

      setRoom({
        ...roomData,
        status: roomData.status as 'waiting' | 'playing' | 'finished'
      });
      setIsConnected(true);
      return true;
    } catch (error) {
      return false;
    }
  }, [playerId]);

  const leaveRoom = useCallback(async (): Promise<void> => {
    try {
      if (room) {
        await supabase
          .from('room_participants')
          .delete()
          .eq('room_id', room.id)
          .eq('player_id', playerId);
      }

      if (channel) {
        await supabase.removeChannel(channel);
        setChannel(null);
      }

      setRoom(null);
      setParticipants([]);
      setIsConnected(false);
    } catch (error) {
      // Silent error handling
    }
  }, [room, channel, playerId]);

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
        setParticipants(data as RoomParticipant[]);
      }
    };

    loadParticipants();
  }, [room]);

  const getPlayerNumber = useCallback((): 1 | 2 | null => {
    if (!playerId || participants.length === 0) return null;
    const participant = participants.find(p => p.player_id === playerId);
    return participant?.player_number || null;
  }, [playerId, participants]);

  return {
    room,
    participants,
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateRoomStatus,
    getPlayerNumber
  };
};
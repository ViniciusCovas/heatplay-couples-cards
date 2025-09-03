import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface RealTimeGameSyncProps {
  roomId: string | null;
  playerId: string;
  onGameStateChange?: (state: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onOpponentAction?: (action: any) => void;
}

interface ConnectionState {
  isConnected: boolean;
  lastPing: Date;
  opponentConnected: boolean;
  reconnectAttempts: number;
}

export const useRealTimeGameSync = ({
  roomId,
  playerId,
  onGameStateChange,
  onConnectionChange,
  onOpponentAction
}: RealTimeGameSyncProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    lastPing: new Date(),
    opponentConnected: false,
    reconnectAttempts: 0
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Fast heartbeat system - every 3 seconds
  const sendHeartbeat = useCallback(async () => {
    if (!roomId || !playerId || !isActiveRef.current) return;

    try {
      const { data, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) {
        logger.error('Heartbeat failed:', error);
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false,
          reconnectAttempts: prev.reconnectAttempts + 1 
        }));
        onConnectionChange?.(false);
        return;
      }

      setConnectionState(prev => ({ 
        ...prev, 
        isConnected: true, 
        lastPing: new Date(),
        reconnectAttempts: 0 
      }));
      onConnectionChange?.(true);

      // Update game state if provided
      if (data && typeof data === 'object' && 'room_state' in data) {
        onGameStateChange?.(data.room_state);
      }

    } catch (error) {
      logger.error('Heartbeat error:', error);
      setConnectionState(prev => ({ 
        ...prev, 
        isConnected: false,
        reconnectAttempts: prev.reconnectAttempts + 1 
      }));
      onConnectionChange?.(false);
    }
  }, [roomId, playerId, onGameStateChange, onConnectionChange]);

  // Setup real-time subscriptions
  const setupRealTimeSubscriptions = useCallback(() => {
    if (!roomId) return;

    const channel = supabase.channel(`game_room_${roomId}`, {
      config: { presence: { key: playerId } }
    });

    // Subscribe to game state changes
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        logger.info('Game room updated:', payload);
        onGameStateChange?.(payload.new);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_sync',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        logger.info('Game sync event:', payload);
        onOpponentAction?.(payload.new);
        
        // Show real-time notifications
        const actionData = payload.new as any;
        if (actionData?.action_type === 'response_submit') {
          toast.info('Your opponent has responded!');
        } else if (actionData?.action_type === 'evaluation_complete') {
          toast.success('Evaluation complete - next round!');
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connection_states',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        // Track opponent connection status
        const connectionData = payload.new as any;
        if (connectionData?.player_id !== playerId) {
          setConnectionState(prev => ({
            ...prev,
            opponentConnected: connectionData?.connection_status === 'connected'
          }));
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const connectedPlayers = Object.keys(presenceState).length;
        logger.info(`Connected players: ${connectedPlayers}`);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.info('Player joined:', newPresences);
        toast.info('Player joined the game');
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.info('Player left:', leftPresences);
        toast.warning('Player left the game');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Real-time subscriptions active');
          // Track presence
          await channel.track({
            player_id: playerId,
            online_at: new Date().toISOString(),
            status: 'active'
          });
          // Send initial heartbeat
          sendHeartbeat();
        }
      });

    channelRef.current = channel;
    return channel;
  }, [roomId, playerId, onGameStateChange, onOpponentAction, sendHeartbeat]);

  // Auto-timeout detection for opponent responses
  const setupTimeoutDetection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set 45-second timeout for opponent responses
    timeoutRef.current = setTimeout(() => {
      toast.warning('Opponent is taking too long - game will auto-advance');
      
      // Trigger auto-advance
      setTimeout(() => {
        sendHeartbeat(); // This will trigger auto-advance if room is stuck
      }, 15000); // Additional 15 seconds before forcing advance
      
    }, 45000);
  }, [sendHeartbeat]);

  // Initialize real-time sync
  useEffect(() => {
    if (!roomId || !playerId) return;

    isActiveRef.current = true;
    
    // Setup subscriptions
    const channel = setupRealTimeSubscriptions();
    if (channel) {
      channelRef.current = channel;
    }
    
    // Setup fast heartbeat (every 3 seconds)
    heartbeatRef.current = setInterval(sendHeartbeat, 3000);
    
    // Setup timeout detection
    setupTimeoutDetection();

    return () => {
      isActiveRef.current = false;
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, playerId, setupRealTimeSubscriptions, sendHeartbeat, setupTimeoutDetection]);

  // Manual reconnection
  const forceReconnect = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
    }
    
    const newChannel = setupRealTimeSubscriptions();
    if (newChannel) {
      channelRef.current = newChannel;
    }
    
    // Immediate heartbeat on reconnect
    sendHeartbeat();
  }, [setupRealTimeSubscriptions, sendHeartbeat]);

  // Reset timeout when game state changes
  const resetTimeout = useCallback(() => {
    setupTimeoutDetection();
  }, [setupTimeoutDetection]);

  return {
    connectionState,
    forceReconnect,
    resetTimeout,
    sendHeartbeat
  };
};
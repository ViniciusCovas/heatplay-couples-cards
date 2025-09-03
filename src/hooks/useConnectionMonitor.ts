import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ConnectionState {
  isConnected: boolean;
  lastPing: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  opponentConnected: boolean;
}

interface UseConnectionMonitorReturn {
  connectionState: ConnectionState;
  reconnect: () => Promise<void>;
  updateConnectionStatus: () => Promise<void>;
}

export const useConnectionMonitor = (
  roomId: string | null,
  playerId: string
): UseConnectionMonitorReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    lastPing: null,
    connectionStatus: 'disconnected',
    opponentConnected: false
  });

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const updateConnectionStatus = useCallback(async () => {
    if (!roomId || !playerId) return;

    try {
      setConnectionState(prev => ({ ...prev, connectionStatus: 'connecting' }));

      const { data, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) {
        logger.error('Connection update failed:', error);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected'
        }));
        return;
      }

      setConnectionState(prev => ({
        ...prev,
        isConnected: true,
        lastPing: new Date(),
        connectionStatus: 'connected'
      }));

      reconnectAttempts.current = 0;
      logger.debug('Connection status updated successfully');

    } catch (error) {
      logger.error('Connection status update error:', error);
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected'
      }));
    }
  }, [roomId, playerId]);

  // Fast connection monitoring - every 3 seconds
  useEffect(() => {
    if (!roomId || !playerId) return;

    // Initial connection
    updateConnectionStatus();

    const interval = setInterval(updateConnectionStatus, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [roomId, playerId, updateConnectionStatus]);

  const reconnect = useCallback(async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      logger.warn('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    logger.info(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);

    await updateConnectionStatus();
  }, [updateConnectionStatus]);

  // Monitor opponent connection status
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`connection_monitor_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connection_states',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const connectionData = payload.new as any;
        if (connectionData?.player_id !== playerId) {
          setConnectionState(prev => ({
            ...prev,
            opponentConnected: connectionData?.connection_status === 'connected'
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  return {
    connectionState,
    reconnect,
    updateConnectionStatus
  };
};
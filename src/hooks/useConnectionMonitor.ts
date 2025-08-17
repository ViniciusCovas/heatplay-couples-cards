import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ConnectionState {
  isConnected: boolean;
  lastPing: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

interface UseConnectionMonitorReturn {
  connectionState: ConnectionState;
  reconnect: () => Promise<void>;
  updateConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
}

export const useConnectionMonitor = (
  roomId: string | null, 
  playerId: string | null
): UseConnectionMonitorReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    lastPing: null,
    connectionStatus: 'disconnected'
  });

  // Update connection status in database using the connection_states table
  const updateConnectionStatus = useCallback(async (status: 'connected' | 'disconnected' | 'reconnecting') => {
    if (!roomId || !playerId) return;

    try {
      // Use the sync function to update connection state
      const { data, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) {
        logger.error('Failed to sync connection state', error);
        return;
      }

      setConnectionState(prev => ({
        ...prev,
        connectionStatus: status,
        lastPing: status === 'connected' ? new Date() : prev.lastPing,
        isConnected: status === 'connected'
      }));

      logger.debug('Connection status updated via sync', { status, roomId, playerId, syncResult: data });
    } catch (error) {
      logger.error('Failed to update connection status', error);
    }
  }, [roomId, playerId]);

  // Periodic connection health check using connection_states table
  useEffect(() => {
    if (!roomId || !playerId) return;

    const pingInterval = setInterval(async () => {
      try {
        // Use the sync function to maintain connection health
        const { data, error } = await supabase.rpc('sync_game_state_reliably', {
          room_id_param: roomId,
          player_id_param: playerId
        });

        if (error) {
          logger.warn('Connection health check failed:', error);
          setConnectionState(prev => ({
            ...prev,
            connectionStatus: 'disconnected',
            isConnected: false
          }));
          return;
        }

        if (data && typeof data === 'object' && 'success' in data && data.success) {
          setConnectionState(prev => ({
            ...prev,
            connectionStatus: 'connected',
            lastPing: new Date(),
            isConnected: true
          }));
          logger.debug('Connection health check successful', { roomId, playerId });
        }
      } catch (error) {
        logger.error('Connection monitoring error:', error);
        setConnectionState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false
        }));
      }
    }, 10000); // Check every 10 seconds (reduced frequency)

    return () => clearInterval(pingInterval);
  }, [roomId, playerId]);

  // Reconnection logic
  const reconnect = useCallback(async () => {
    if (!roomId || !playerId) return;

    logger.info('Attempting to reconnect...');
    setConnectionState(prev => ({ ...prev, connectionStatus: 'reconnecting' }));

    try {
      // Try to sync game state
      const { data, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        setConnectionState({
          isConnected: true,
          lastPing: new Date(),
          connectionStatus: 'connected'
        });
        logger.info('Reconnection successful');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      logger.error('Reconnection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        connectionStatus: 'disconnected',
        isConnected: false
      }));
    }
  }, [roomId, playerId]);

  // Initialize connection monitoring
  useEffect(() => {
    if (roomId && playerId) {
      updateConnectionStatus('connected');
    }
  }, [roomId, playerId, updateConnectionStatus]);

  return {
    connectionState,
    reconnect,
    updateConnectionStatus
  };
};
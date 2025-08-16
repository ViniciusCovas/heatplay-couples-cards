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

  // Update connection status in database
  const updateConnectionStatus = useCallback(async (status: 'connected' | 'disconnected' | 'reconnecting') => {
    if (!roomId || !playerId) return;

    try {
      await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      setConnectionState(prev => ({
        ...prev,
        connectionStatus: status,
        lastPing: status === 'connected' ? new Date() : prev.lastPing,
        isConnected: status === 'connected'
      }));

      logger.debug('Connection status updated', { status, roomId, playerId });
    } catch (error) {
      logger.error('Failed to update connection status', error);
    }
  }, [roomId, playerId]);

  // Periodic connection health check
  useEffect(() => {
    if (!roomId || !playerId) return;

    const pingInterval = setInterval(async () => {
      try {
      // Use RPC to check connection state since table might not be in types
      const { data, error } = await supabase.rpc('sync_game_state_reliably', {
        room_id_param: roomId,
        player_id_param: playerId
      });

      if (error) {
        logger.warn('Connection state check failed:', error);
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
      }
      } catch (error) {
        logger.error('Connection monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds

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
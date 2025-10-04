import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

// Generate unique session ID for this browser session
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Notification rate limiting (only for game events, not join/leave)
const NOTIFICATION_COOLDOWN = 5000; // 5 seconds
let lastNotificationTime = 0;

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

interface PresenceState {
  [key: string]: any[];
}

// Track presence state for connection monitoring only
const lastPresenceUpdateRef: { current: number } = { current: 0 };

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
  const hasTrackedPresenceRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);

  // Rate-limited notification helper
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const now = Date.now();
    if (now - lastNotificationTime > NOTIFICATION_COOLDOWN) {
      lastNotificationTime = now;
      if (type === 'info') toast.info(message);
      else if (type === 'success') toast.success(message);
      else if (type === 'warning') toast.warning(message);
    }
  }, []);

  // Optimized heartbeat system - every 30 seconds
  const sendHeartbeat = useCallback(async () => {
    if (!roomId || !playerId || !isActiveRef.current) return;

    try {
      logger.debug(`[${SESSION_ID}] Sending heartbeat for room ${roomId}`);
      
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

  // Exponential backoff for reconnections
  const getBackoffDelay = useCallback((attemptNumber: number) => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 32000; // 32 seconds
    const jitter = Math.random() * 1000; // 0-1 second jitter
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    return delay + jitter;
  }, []);

  // Setup real-time subscriptions with connection lifecycle logging
  const setupRealTimeSubscriptions = useCallback(() => {
    if (!roomId) return;

    logger.info(`[${SESSION_ID}] Realtime → connecting to room ${roomId}`);

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
        
        // Show real-time notifications with rate limiting
        const actionData = payload.new as any;
        if (actionData?.action_type === 'response_submit') {
          showNotification('Your opponent has responded!');
        } else if (actionData?.action_type === 'evaluation_complete') {
          showNotification('Evaluation complete - next round!', 'success');
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
        const presenceState = channel.presenceState() as PresenceState;
        const now = Date.now();
        
        // Debounce presence updates - only process if enough time has passed
        if (now - lastPresenceUpdateRef.current < 2000) return;
        lastPresenceUpdateRef.current = now;
        
        const currentPlayers = Object.keys(presenceState);
        logger.debug(`[${SESSION_ID}] Presence sync - players: ${currentPlayers.length}`);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug(`[${SESSION_ID}] Player joined:`, { key, newPresences });
        
        // Update opponent connection status for UI indicators only
        if (newPresences && newPresences.length > 0) {
          const joinedPlayer = newPresences[0];
          const isThisSession = joinedPlayer?.session_id === SESSION_ID;
          
          if (!isThisSession) {
            setConnectionState(prev => ({
              ...prev,
              opponentConnected: true
            }));
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug(`[${SESSION_ID}] Player left:`, { key, leftPresences });
        
        // Update opponent connection status for UI indicators only
        if (leftPresences && leftPresences.length > 0) {
          const leftPlayer = leftPresences[0];
          const isThisSession = leftPlayer?.session_id === SESSION_ID;
          
          if (!isThisSession) {
            setConnectionState(prev => ({
              ...prev,
              opponentConnected: false
            }));
          }
        }
      })
      .subscribe(async (status, err) => {
        logger.info(`[${SESSION_ID}] Realtime → status: ${status}`, err);

        if (status === 'SUBSCRIBED') {
          logger.info(`[${SESSION_ID}] Realtime → open (room ${roomId})`);
          isSubscribedRef.current = true;
          
          // Only track presence once to prevent duplicate join events
          if (!hasTrackedPresenceRef.current && isActiveRef.current) {
            hasTrackedPresenceRef.current = true;
            await channel.track({
              player_id: playerId,
              session_id: SESSION_ID,
              online_at: new Date().toISOString(),
              status: 'active'
            });
            logger.info(`[${SESSION_ID}] Presence tracked for player ${playerId}`);
          }
          
          // Send initial heartbeat
          sendHeartbeat();
          
          // Reset reconnect attempts on successful connection
          setConnectionState(prev => ({ ...prev, reconnectAttempts: 0 }));
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`[${SESSION_ID}] Realtime → error:`, err);
          isSubscribedRef.current = false;
          
          // Attempt reconnection with exponential backoff
          if (isActiveRef.current) {
            setConnectionState(prev => {
              const newAttempts = prev.reconnectAttempts + 1;
              const backoffDelay = getBackoffDelay(newAttempts);
              
              logger.warn(`[${SESSION_ID}] Realtime → reconnecting in ${Math.round(backoffDelay)}ms (attempt ${newAttempts})`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current) {
                  logger.info(`[${SESSION_ID}] Realtime → attempting reconnect`);
                  forceReconnect();
                }
              }, backoffDelay);
              
              return { ...prev, reconnectAttempts: newAttempts, isConnected: false };
            });
          }
        } else if (status === 'CLOSED') {
          logger.warn(`[${SESSION_ID}] Realtime → closed (reason: ${err?.message || 'unknown'})`);
          isSubscribedRef.current = false;
          setConnectionState(prev => ({ ...prev, isConnected: false }));
        } else if (status === 'TIMED_OUT') {
          logger.error(`[${SESSION_ID}] Realtime → timed out`);
          isSubscribedRef.current = false;
          setConnectionState(prev => ({ ...prev, isConnected: false }));
        }
      });

    channelRef.current = channel;
    return channel;
  }, [roomId, playerId, onGameStateChange, onOpponentAction, sendHeartbeat, getBackoffDelay, showNotification]);

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
    isSubscribedRef.current = false;
    
    // Setup subscriptions
    const channel = setupRealTimeSubscriptions();
    if (channel) {
      channelRef.current = channel;
    }
    
    // Setup optimized heartbeat (every 30 seconds)
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    
    // Setup timeout detection
    setupTimeoutDetection();

    return () => {
      logger.info(`[${SESSION_ID}] Realtime → cleaning up room ${roomId}`);
      isActiveRef.current = false;
      hasTrackedPresenceRef.current = false;
      isSubscribedRef.current = false;
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (channel) {
        // Delay cleanup to prevent race condition with StrictMode
        setTimeout(() => {
          logger.info(`[${SESSION_ID}] Realtime → removing channel`);
          supabase.removeChannel(channel);
        }, 100);
      }
    };
  }, [roomId, playerId, setupRealTimeSubscriptions, sendHeartbeat, setupTimeoutDetection]);

  // Manual reconnection
  const forceReconnect = useCallback(async () => {
    logger.info(`[${SESSION_ID}] Realtime → force reconnecting...`);
    hasTrackedPresenceRef.current = false;
    isSubscribedRef.current = false;
    
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (!isActiveRef.current) {
      logger.warn(`[${SESSION_ID}] Realtime → reconnect aborted (component unmounted)`);
      return;
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
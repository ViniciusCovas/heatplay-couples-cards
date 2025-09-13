import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { usePauseBackend } from './usePauseBackend';

export const useGameQueueProcessor = (roomId: string | null) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  const isPaused = usePauseBackend();

  const processQueue = async () => {
    if (processingRef.current || !roomId) return;
    
    processingRef.current = true;
    try {
      logger.debug('Processing game queue...');
      
      const { data, error } = await supabase.functions.invoke('process-game-queue', {
        body: { room_id: roomId }
      });

      if (error) {
        logger.error('Queue processing error:', error);
      } else {
        logger.debug('Queue processed successfully:', data);
      }
    } catch (error) {
      logger.error('Failed to process queue:', error);
    } finally {
      processingRef.current = false;
    }
  };

  const processImmediately = async () => {
    if (!roomId) return;
    
    // Process queue immediately for real-time response
    await processQueue();
    
    // Also trigger disconnection detection
    try {
      await supabase.rpc('detect_disconnected_players');
      await supabase.rpc('auto_advance_stuck_rooms');
    } catch (error) {
      logger.error('Failed to check for stuck rooms:', error);
    }
  };

  useEffect(() => {
    if (!roomId || isPaused) return;

    // Process queue immediately when room changes
    processQueue();

    // Set up interval to process queue every 2 seconds for real-time games
    intervalRef.current = setInterval(processQueue, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomId, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { processQueue, processImmediately };
};
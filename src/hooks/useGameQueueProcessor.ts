import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useGameQueueProcessor = (roomId: string | null) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

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

  useEffect(() => {
    if (!roomId) return;

    // Process queue immediately when room changes
    processQueue();

    // Set up interval to process queue every 5 seconds
    intervalRef.current = setInterval(processQueue, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { processQueue };
};
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePlayerId supports hybrid authentication:
 * - Authenticated users: Uses auth.uid() for room creation/credits
 * - Anonymous users: Uses random ID for room joining
 */
export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Initialize player ID synchronously to avoid race conditions
    try {
      const stored = localStorage.getItem('player_id');
      if (stored) {
        setPlayerId(stored);
        logger.debug('Loaded player id from localStorage', { playerId: stored });
      } else {
        const anonymousId = 'player_' + Math.random().toString(36).substr(2, 12);
        localStorage.setItem('player_id', anonymousId);
        setPlayerId(anonymousId);
        logger.debug('Generated initial anonymous player id', { anonymousId });
      }
    } catch (err) {
      // localStorage may be unavailable (private mode), fallback to ephemeral id
      const fallback = 'player_' + Math.random().toString(36).substr(2, 12);
      setPlayerId(fallback);
      logger.warn('localStorage unavailable, using ephemeral player id', { fallback, error: err });
    } finally {
      setIsInitializing(false);
    }

    // Subscribe to auth changes to prefer authenticated uid when available
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authId = session?.user?.id ?? null;
      if (authId) {
        try {
          // Persist auth id as player id for continuity
          localStorage.setItem('player_id', authId);
          setPlayerId(authId);
          logger.debug('Auth state changed, updated player id to auth uid', { authId });
        } catch (err) {
          logger.warn('Failed to persist auth player id to localStorage', { authId, error: err });
          setPlayerId(authId); // still set in memory
        }
      } else {
        // If user logged out, keep the stored existing id (already initialized above).
        const storedId = localStorage.getItem('player_id');
        if (storedId) {
          setPlayerId(storedId);
        } else {
          const anonymousId = 'player_' + Math.random().toString(36).substr(2, 12);
          try {
            localStorage.setItem('player_id', anonymousId);
          } catch {}
          setPlayerId(anonymousId);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { playerId, isReady: !isInitializing && !!playerId };
};

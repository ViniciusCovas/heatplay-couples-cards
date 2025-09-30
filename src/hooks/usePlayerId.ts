import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePlayerId - Supports both authenticated and anonymous users
 * - Authenticated users: Returns their Supabase Auth ID
 * - Anonymous users: Generates and persists a temporary UUID in localStorage
 */
export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        // Authenticated user
        setPlayerId(session.user.id);
        logger.debug('Loaded player id from auth session', { playerId: session.user.id });
      } else {
        // Anonymous user - generate or retrieve temporary ID
        let anonymousId = localStorage.getItem('anonymous_player_id');
        if (!anonymousId) {
          anonymousId = crypto.randomUUID();
          localStorage.setItem('anonymous_player_id', anonymousId);
          logger.debug('Generated new anonymous player id', { anonymousId });
        } else {
          logger.debug('Retrieved existing anonymous player id', { anonymousId });
        }
        setPlayerId(anonymousId);
      }
      setIsInitializing(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        // User logged in - use auth ID
        setPlayerId(session.user.id);
        logger.debug('Auth state changed, updated to auth player id', { authId: session.user.id });
      } else {
        // User logged out - revert to anonymous ID
        let anonymousId = localStorage.getItem('anonymous_player_id');
        if (!anonymousId) {
          anonymousId = crypto.randomUUID();
          localStorage.setItem('anonymous_player_id', anonymousId);
        }
        setPlayerId(anonymousId);
        logger.debug('Auth state changed, reverted to anonymous player id', { anonymousId });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { playerId, isReady: !isInitializing };
};

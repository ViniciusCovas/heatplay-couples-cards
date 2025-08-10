import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePlayerId now prefers the authenticated Supabase user id (auth.uid()).
 * Falls back to the legacy localStorage-based random id for any unauthenticated context.
 */
export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Try to use the authenticated user id
      const { data: { user } } = await supabase.auth.getUser();
      let resolvedPlayerId: string | null = null;

      if (user?.id) {
        resolvedPlayerId = user.id;
        localStorage.setItem('player_id', resolvedPlayerId);
        logger.debug('Using authenticated user id as player id', { resolvedPlayerId });
      } else {
        // Legacy fallback to stored/random id
        let storedPlayerId = localStorage.getItem('player_id');
        logger.debug('Stored player ID', { storedPlayerId });
        
        if (!storedPlayerId) {
          storedPlayerId = 'player_' + Math.random().toString(36).substr(2, 12);
          localStorage.setItem('player_id', storedPlayerId);
          logger.debug('Generated new player ID', { storedPlayerId });
        }
        resolvedPlayerId = storedPlayerId;
      }

      if (isMounted && resolvedPlayerId) {
        setPlayerId(resolvedPlayerId);
      }
    };

    init();

    // Keep playerId in sync with auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authId = session?.user?.id;
      if (authId) {
        localStorage.setItem('player_id', authId);
        setPlayerId(authId);
        logger.debug('Auth state changed, updated player id to auth uid', { authId });
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return playerId;
};

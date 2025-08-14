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
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let resolvedPlayerId: string | null = null;

        if (user?.id) {
          // Authenticated user - use their auth ID
          resolvedPlayerId = user.id;
          localStorage.setItem('player_id', resolvedPlayerId);
          logger.debug('Using authenticated user id as player id', { resolvedPlayerId });
        } else {
          // Anonymous user - use stored/random ID for room joining
          let storedPlayerId = localStorage.getItem('player_id');
          logger.debug('Stored player ID', { storedPlayerId });
          
          if (!storedPlayerId) {
            storedPlayerId = 'player_' + Math.random().toString(36).substr(2, 12);
            localStorage.setItem('player_id', storedPlayerId);
            logger.debug('Generated new player ID for anonymous user', { storedPlayerId });
          }
          resolvedPlayerId = storedPlayerId;
        }

        if (isMounted && resolvedPlayerId) {
          setPlayerId(resolvedPlayerId);
          setIsReady(true);
        }
      } catch (error) {
        logger.error('Error initializing player ID', error);
        // Fallback to anonymous ID generation
        const fallbackId = 'player_' + Math.random().toString(36).substr(2, 12);
        localStorage.setItem('player_id', fallbackId);
        if (isMounted) {
          setPlayerId(fallbackId);
          setIsReady(true);
        }
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
      } else {
        // User logged out - fall back to anonymous ID
        const storedId = localStorage.getItem('player_id');
        if (!storedId) {
          const anonymousId = 'player_' + Math.random().toString(36).substr(2, 12);
          localStorage.setItem('player_id', anonymousId);
          setPlayerId(anonymousId);
          logger.debug('User logged out, generated new anonymous ID', { anonymousId });
        } else {
          setPlayerId(storedId);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { playerId, isReady };
};

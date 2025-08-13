import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePlayerId supports hybrid authentication with separate ID storage:
 * - Authenticated users: Uses auth.uid() stored in 'auth_player_id'
 * - Anonymous users: Uses random ID stored in 'anon_player_id'
 */
export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let resolvedPlayerId: string | null = null;

      if (user?.id) {
        // Authenticated user - use their auth ID and store in separate key
        resolvedPlayerId = user.id;
        localStorage.setItem('auth_player_id', resolvedPlayerId);
        // Clear any existing anonymous ID to prevent collision
        localStorage.removeItem('anon_player_id');
        logger.debug('Using authenticated user id as player id', { resolvedPlayerId, isAuthenticated: true });
      } else {
        // Anonymous user - use stored/random ID for room joining with separate key
        let storedPlayerId = localStorage.getItem('anon_player_id');
        logger.debug('Stored anonymous player ID', { storedPlayerId });
        
        if (!storedPlayerId) {
          storedPlayerId = 'player_' + Math.random().toString(36).substr(2, 12);
          localStorage.setItem('anon_player_id', storedPlayerId);
          logger.debug('Generated new anonymous player ID', { storedPlayerId });
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
        // User logged in - use auth ID and clear anonymous ID
        localStorage.setItem('auth_player_id', authId);
        localStorage.removeItem('anon_player_id');
        setPlayerId(authId);
        logger.debug('Auth state changed, updated player id to auth uid', { authId, isAuthenticated: true });
      } else {
        // User logged out - generate fresh anonymous ID (don't reuse auth ID)
        localStorage.removeItem('auth_player_id');
        const anonymousId = 'player_' + Math.random().toString(36).substr(2, 12);
        localStorage.setItem('anon_player_id', anonymousId);
        setPlayerId(anonymousId);
        logger.debug('User logged out, generated fresh anonymous ID', { anonymousId, isAuthenticated: false });
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return playerId;
};

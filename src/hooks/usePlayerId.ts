import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePlayerId - Authenticated users only
 * Returns the authenticated user's ID from Supabase Auth
 */
export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setPlayerId(session.user.id);
        logger.debug('Loaded player id from auth session', { playerId: session.user.id });
      }
      setIsInitializing(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authId = session?.user?.id ?? '';
      setPlayerId(authId);
      if (authId) {
        logger.debug('Auth state changed, updated player id', { authId });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { playerId, isReady: !isInitializing };
};

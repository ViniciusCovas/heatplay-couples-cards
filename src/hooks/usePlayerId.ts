import { useAuth } from '@/contexts/AuthContext';

/** Guest players have a real anonymous-auth JWT, just like the room host. */
export const usePlayerId = () => {
  const { user, loading } = useAuth();
  return { playerId: user?.id ?? '', isReady: !loading && !!user?.id };
};

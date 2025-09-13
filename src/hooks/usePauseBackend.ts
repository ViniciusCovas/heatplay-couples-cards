import { useEffect, useState } from 'react';

/**
 * Hook to detect if backend operations should be paused for testing
 * Checks for ?pauseBackend=1 URL parameter
 */
export const usePauseBackend = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pauseBackend = urlParams.get('pauseBackend');
    setIsPaused(pauseBackend === '1' || pauseBackend === 'true');
  }, []);

  return isPaused;
};

/**
 * BroadcastChannel for local state sync when backend is paused
 */
export const createLocalGameChannel = (roomId: string) => {
  if (typeof window === 'undefined') return null;
  return new BroadcastChannel(`local-game-${roomId}`);
};

/**
 * Local state event types for backend-less testing
 */
export interface LocalGameEvent {
  type: 'evaluation_complete' | 'game_advance' | 'phase_change';
  data: {
    nextPhase?: string;
    nextPlayer?: string;
    gameFinished?: boolean;
    evaluationBy?: string;
    round?: number;
    timestamp: string;
  };
}
import { useState, useEffect } from 'react';

export const usePlayerId = () => {
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    // Check if we already have a player ID stored
    let storedPlayerId = localStorage.getItem('player_id');
    
    if (!storedPlayerId) {
      // Generate a new unique player ID
      storedPlayerId = 'player_' + Math.random().toString(36).substr(2, 12);
      localStorage.setItem('player_id', storedPlayerId);
    }
    
    setPlayerId(storedPlayerId);
  }, []);

  return playerId;
};
import { useState, useEffect, useCallback } from 'react';
import { useRealTimeGameSync } from './useGameRealTimeSync';
import { useGameQueueProcessor } from './useGameQueueProcessor';
import { usePlayerNumber } from './usePlayerNumber';

interface GameRealTimeStateProps {
  roomId: string | null;
  playerId: string;
}

interface GameRealTimeState {
  isConnected: boolean;
  opponentConnected: boolean;
  lastPing: Date | null;
  isWaitingForOpponent: boolean;
  timeRemaining: number;
  gamePhase: string;
  currentTurn: string;
}

export const useGameRealTimeState = ({ roomId, playerId }: GameRealTimeStateProps) => {
  const [gameState, setGameState] = useState<GameRealTimeState>({
    isConnected: false,
    opponentConnected: false,
    lastPing: null,
    isWaitingForOpponent: false,
    timeRemaining: 0,
    gamePhase: 'waiting',
    currentTurn: 'player1'
  });

  const [timeoutStart, setTimeoutStart] = useState<Date | null>(null);

  // Get proper player number from database
  const { playerNumber, isPlayer1, isPlayer2, loading: playerNumberLoading } = usePlayerNumber({ roomId, playerId });

  // Use the queue processor for real-time processing
  const { processImmediately } = useGameQueueProcessor(roomId);

  // Handle game state changes
  const handleGameStateChange = useCallback((state: any) => {
    if (state?.current_phase && playerNumber !== null) {
      setGameState(prev => ({
        ...prev,
        gamePhase: state.current_phase,
        currentTurn: state.current_turn || 'player1'
      }));
      
      // Determine if it's my turn using proper player number from database
      const isMyTurn = (state.current_turn === 'player1' && isPlayer1) ||
                       (state.current_turn === 'player2' && isPlayer2);
      
      setGameState(prev => ({
        ...prev,
        isWaitingForOpponent: state.current_phase === 'evaluation' && !isMyTurn
      }));

      // Start timeout tracking for evaluation phase
      if (state.current_phase === 'evaluation' && !isMyTurn) {
        setTimeoutStart(new Date());
      } else {
        setTimeoutStart(null);
      }
    }
  }, [playerNumber, isPlayer1, isPlayer2]);

  // Handle connection state changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setGameState(prev => ({
      ...prev,
      isConnected: connected,
      lastPing: connected ? new Date() : prev.lastPing
    }));
  }, []);

  // Handle opponent actions
  const handleOpponentAction = useCallback((action: any) => {
    if (action?.action_type === 'response_submit') {
      setGameState(prev => ({
        ...prev,
        isWaitingForOpponent: false
      }));
      setTimeoutStart(null);
    }
    
    // Process the action immediately for real-time response
    processImmediately();
  }, [processImmediately]);

  // Use the real-time sync hook
  const { connectionState, forceReconnect, resetTimeout } = useRealTimeGameSync({
    roomId,
    playerId,
    onGameStateChange: handleGameStateChange,
    onConnectionChange: handleConnectionChange,
    onOpponentAction: handleOpponentAction
  });

  // Update connection state from the sync hook
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      isConnected: connectionState.isConnected,
      opponentConnected: connectionState.opponentConnected,
      lastPing: connectionState.lastPing
    }));
  }, [connectionState]);

  // Calculate time remaining for timeout
  useEffect(() => {
    if (!timeoutStart || !gameState.isWaitingForOpponent) {
      setGameState(prev => ({ ...prev, timeRemaining: 0 }));
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (new Date().getTime() - timeoutStart.getTime()) / 1000;
      const remaining = Math.max(0, 45 - elapsed); // 45 second timeout
      
      setGameState(prev => ({ ...prev, timeRemaining: Math.floor(remaining) }));
      
      if (remaining <= 0) {
        setTimeoutStart(null);
        setGameState(prev => ({ ...prev, isWaitingForOpponent: false }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutStart, gameState.isWaitingForOpponent]);

  return {
    gameState,
    forceReconnect,
    resetTimeout,
    processImmediately,
    playerNumber,
    isPlayer1,
    isPlayer2,
    playerNumberLoading
  };
};
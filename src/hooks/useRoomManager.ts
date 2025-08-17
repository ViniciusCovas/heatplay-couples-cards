import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoomService } from './useRoomService';
import { usePlayerId } from './usePlayerId';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

interface RoomManagerState {
  isJoining: boolean;
  joinAttempts: number;
  hasJoinedSuccessfully: boolean;
  lastProcessedRoomCode: string | null;
}

export const useRoomManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { joinRoom, isConnected, room } = useRoomService();
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [state, setState] = useState<RoomManagerState>({
    isJoining: false,
    joinAttempts: 0,
    hasJoinedSuccessfully: false,
    lastProcessedRoomCode: null
  });

  const clearRoomCodeFromUrl = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('room');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const showErrorAndRedirect = useCallback((title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive"
    });
    clearRoomCodeFromUrl();
    navigate('/', { replace: true });
  }, [toast, clearRoomCodeFromUrl, navigate]);

  const handleRoomJoin = useCallback(async (roomCode: string): Promise<boolean> => {
    // Prevent duplicate attempts for the same room code
    if (state.isJoining || state.lastProcessedRoomCode === roomCode) {
      logger.debug('Skipping room join - already processing or processed', { 
        roomCode, 
        isJoining: state.isJoining,
        lastProcessed: state.lastProcessedRoomCode 
      });
      return false;
    }

    // If already connected to the target room, skip
    if (isConnected && room?.room_code === roomCode) {
      logger.debug('Already connected to target room', { roomCode, currentRoom: room.room_code });
      setState(prev => ({ ...prev, hasJoinedSuccessfully: true, lastProcessedRoomCode: roomCode }));
      return true;
    }

    // Check readiness
    if (!playerIdReady || !playerId) {
      logger.debug('Player not ready for room joining', { playerIdReady, playerId });
      return false;
    }

    setState(prev => ({ 
      ...prev, 
      isJoining: true, 
      joinAttempts: prev.joinAttempts + 1,
      lastProcessedRoomCode: roomCode 
    }));

    try {
      logger.info('Attempting to join room via centralized manager', { roomCode, attempt: state.joinAttempts + 1 });
      
      const success = await joinRoom(roomCode);
      
      if (success) {
        logger.info('Successfully joined room via manager');
        setState(prev => ({ 
          ...prev, 
          isJoining: false, 
          hasJoinedSuccessfully: true,
          joinAttempts: 0 
        }));
        return true;
      } else {
        logger.warn('Room join failed via manager');
        setState(prev => ({ ...prev, isJoining: false }));
        
        // Show generic error after failed attempt
        showErrorAndRedirect(
          t('game.errors.connectionError'),
          t('game.errors.verifyRoomCode')
        );
        return false;
      }
    } catch (error) {
      logger.error('Room join error via manager', error);
      setState(prev => ({ ...prev, isJoining: false }));
      
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      
      if (errorMessage === 'room_full') {
        showErrorAndRedirect(
          t('game.errors.roomFull'),
          t('game.errors.roomFullDescription')
        );
      } else if (errorMessage === 'room_not_found') {
        showErrorAndRedirect(
          t('game.errors.roomNotFound'),
          t('game.errors.roomNotFoundDescription')
        );
      } else {
        showErrorAndRedirect(
          t('game.errors.connectionError'),
          t('game.errors.verifyRoomCode')
        );
      }
      return false;
    }
  }, [state.isJoining, state.lastProcessedRoomCode, state.joinAttempts, isConnected, room, playerIdReady, playerId, joinRoom, showErrorAndRedirect, t]);

  // Auto-join logic - only runs once per room code
  useEffect(() => {
    const roomCode = searchParams.get('room');
    
    if (roomCode && !state.hasJoinedSuccessfully && !state.isJoining) {
      // Reset state for new room code
      if (state.lastProcessedRoomCode !== roomCode) {
        setState(prev => ({ 
          ...prev, 
          hasJoinedSuccessfully: false, 
          joinAttempts: 0,
          lastProcessedRoomCode: null 
        }));
      }
      
      handleRoomJoin(roomCode);
    }
  }, [searchParams, state.hasJoinedSuccessfully, state.isJoining, state.lastProcessedRoomCode, handleRoomJoin]);

  // Clear processed room code when URL changes
  useEffect(() => {
    const roomCode = searchParams.get('room');
    if (!roomCode && state.lastProcessedRoomCode) {
      setState(prev => ({ 
        ...prev, 
        lastProcessedRoomCode: null, 
        hasJoinedSuccessfully: false,
        joinAttempts: 0 
      }));
    }
  }, [searchParams, state.lastProcessedRoomCode]);

  return {
    isJoining: state.isJoining,
    hasJoinedSuccessfully: state.hasJoinedSuccessfully,
    clearRoomCodeFromUrl,
    handleRoomJoin
  };
};
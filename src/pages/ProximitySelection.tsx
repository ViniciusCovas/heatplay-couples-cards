
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useRoomService } from '@/hooks/useRoomService';
import { useGameSync } from '@/hooks/useGameSync';
import { usePlayerId } from '@/hooks/usePlayerId';
import { ProximitySelector } from '@/components/game/ProximitySelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ProximitySelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { room, participants, isConnected, joinRoom } = useRoomService();
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { user } = useAuth();
  const { gameState } = useGameSync(room?.id || null, playerId);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isRoomLoaded, setIsRoomLoaded] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const hasProcessedUrlRef = useRef(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Get room info from navigation state or URL params
  const stateRoomCode = location.state?.roomCode;
  const urlRoomCode = searchParams.get('room');
  const isCreator = location.state?.isCreator || false;
  const roomCode = stateRoomCode || urlRoomCode;

  logger.debug('ProximitySelection initialized', {
    stateRoomCode,
    urlRoomCode,
    isCreator,
    finalRoomCode: roomCode
  });

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
  }, [roomCode, navigate]);

  // System readiness check - ensure all dependencies are ready
  useEffect(() => {
    const checkSystemReady = () => {
      if (playerIdReady && playerId) {
        setIsSystemReady(true);
        logger.debug('System ready for room operations', { playerId, playerIdReady });
      } else {
        setIsSystemReady(false);
        logger.debug('System not ready', { playerId, playerIdReady });
      }
    };

    checkSystemReady();
  }, [playerId, playerIdReady]);

  // Handle room joining for non-creators or load room data for creators with race condition prevention
  useEffect(() => {
    const handleRoomAccess = async () => {
      // Prevent race conditions and duplicate calls
      if (!roomCode || !isSystemReady || isJoining || hasProcessedUrlRef.current) return;
      
      // Prevent duplicate processing
      hasProcessedUrlRef.current = true;
      setIsJoining(true);
      
      try {
        // Check if we already have room data
        if (room && room.room_code === roomCode) {
          setIsRoomLoaded(true);
          return;
        }
        
        logger.debug('Processing room access', { roomCode, isCreator, isJoining: true });
        
        if (isCreator) {
          // For creators, attempt to join to sync room state properly
          logger.debug('Creator joining room to sync state', { roomCode });
          const success = await joinRoom(roomCode);
          if (success) {
            setIsRoomLoaded(true);
            logger.debug('Creator successfully synced room state');
          } else {
            logger.warn('Creator failed to sync room state');
            setIsRoomLoaded(true); // Still proceed for creators
          }
        } else {
          // For joiners, attempt to join the room
          logger.debug('Joiner attempting to join room', { roomCode });
          const success = await joinRoom(roomCode);
          if (success) {
            setIsRoomLoaded(true);
            logger.debug('Joiner successfully joined room');
          } else {
            logger.warn('Joiner failed to join room');
            toast({
              title: t('proximitySelection.errors.joinFailed'),
              description: t('proximitySelection.errors.invalidCode'),
            });
            navigate('/');
          }
        }
      } catch (error) {
        logger.warn('Error handling room access', error);
        toast({
          title: t('proximitySelection.errors.loadingFailed'),
          description: t('proximitySelection.errors.tryAgain'),
        });
        navigate('/');
      } finally {
        setIsJoining(false);
      }
    };
    
    handleRoomAccess();
    
    // Cleanup function
    return () => {
      if (roomCode) {
        hasProcessedUrlRef.current = false;
      }
    };
  }, [roomCode, isSystemReady, room?.room_code, isCreator]);

  useEffect(() => {
    // Navigate to level select when proximity question is answered
    if (gameState?.proximity_question_answered && gameState?.current_phase === 'level-selection') {
      navigate('/level-select', { state: { roomCode, isCreator } });
    }
  }, [gameState, navigate, roomCode, isCreator]);

  const handleProximitySelect = (isClose: boolean) => {
    logger.debug('Proximity selected:', isClose);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Show loading if system isn't ready or room isn't loaded
  if (!isSystemReady || !isRoomLoaded || isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>
            {!isSystemReady
              ? "Initializing player..."
              : isJoining
              ? `${isCreator ? 'Syncing' : 'Joining'} room...`
              : !isRoomLoaded
              ? "Loading room data..."
              : t('proximitySelection.errors.loadingRoom')
            }
          </p>
          <Button onClick={handleGoBack} variant="outline">
            {t('proximitySelection.errors.backToHome')}
          </Button>
        </Card>
      </div>
    );
  }

  // Show loading if room data is not available yet (fallback)
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>Waiting for room data...</p>
          <Button onClick={handleGoBack} variant="outline">
            {t('proximitySelection.errors.backToHome')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('proximitySelection.errors.backToHome')}
        </Button>
        <div className="text-sm text-muted-foreground">
          {t('game.room')}: {room.room_code} | {t('waitingRoom.players')}: {participants.length}/2
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ProximitySelector
            isVisible={true}
            onSelect={handleProximitySelect}
            roomCode={roomCode}
            room={room}
            participants={participants}
          />
        </div>
      </div>
    </div>
  );
};

export default ProximitySelection;

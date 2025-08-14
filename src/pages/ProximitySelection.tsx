
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const ProximitySelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const { room, participants, joinRoom, isConnected } = useRoomService();
  const { playerId, isLoading: isPlayerIdLoading } = usePlayerId();
  const { gameState } = useGameSync(room?.id || null, playerId);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Auto-join room state
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
  }, [roomCode, navigate]);

  // Auto-join room if we have a roomCode but aren't connected
  // ONLY for players trying to join (not room creators) and avoid duplicate joins
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    const autoJoinRoom = async () => {
      // Check if we're already a participant in this room or already attempted join
      const isAlreadyParticipant = participants.some(p => p.player_id === playerId);
      
      // Skip if we already have a room/connection, already attempted join, or conditions not met
      if (roomCode && !isConnected && !room && !isPlayerIdLoading && playerId && !isAlreadyParticipant && !hasAttemptedJoin && retryCount < maxRetries) {
        logger.debug(`🔗 Auto-joining room attempt ${retryCount + 1} (ROOM JOINER):`, { 
          roomCode, 
          playerId, 
          isAlreadyParticipant,
          hasAttemptedJoin,
          retryCount
        });
        
        setIsRetrying(true);
        setHasAttemptedJoin(true); // Mark that we've attempted to join
        
        try {
          const success = await joinRoom(roomCode);
          if (success) {
            logger.debug('✅ Successfully joined room, stopping retries');
            setRetryCount(0);
            setIsRetrying(false);
          } else {
            logger.debug(`❌ Failed to join room (attempt ${retryCount + 1})`);
            setRetryCount(prev => prev + 1);
            
            // Retry after 2 seconds only if not at max retries
            if (retryCount + 1 < maxRetries) {
              retryTimeout = setTimeout(() => {
                setIsRetrying(false);
                setHasAttemptedJoin(false); // Allow retry
              }, 2000);
            } else {
              setIsRetrying(false);
              toast({
                title: t('proximitySelection.errors.connectionError'),
                description: t('proximitySelection.errors.connectionFailed', { roomCode, maxRetries }),
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          logger.error(`❌ Auto-join error (attempt ${retryCount + 1}):`, error);
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
          
          if (retryCount + 1 >= maxRetries) {
            toast({
              title: t('proximitySelection.errors.connectionError'),
              description: t('proximitySelection.errors.verifyRoomCode'),
              variant: "destructive"
            });
          } else {
            // Allow retry for legitimate errors
            setHasAttemptedJoin(false);
          }
        }
      }
    };
    
    autoJoinRoom();
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomCode, isConnected, room, joinRoom, retryCount, toast, t, isPlayerIdLoading, playerId, hasAttemptedJoin]);

  // Reset join attempt state when participants change (successful join detected)
  useEffect(() => {
    if (participants.some(p => p.player_id === playerId) && hasAttemptedJoin) {
      logger.debug('🎯 Player found in participants, resetting join attempt state');
      setHasAttemptedJoin(false);
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [participants, playerId, hasAttemptedJoin]);

  useEffect(() => {
    // Navigate to level select when proximity question is answered
    if (gameState?.proximity_question_answered && gameState?.current_phase === 'level-selection') {
      navigate(`/level-select?room=${roomCode}`);
    }
  }, [gameState, navigate, roomCode]);

  const handleProximitySelect = (isClose: boolean) => {
    logger.debug('Proximity selected:', isClose);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Show loading if we don't have room yet, are retrying, or participants aren't loaded
  if (!room || isRetrying || participants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>
            {isRetrying 
              ? t('proximitySelection.errors.connectingAttempt', { current: retryCount + 1, max: maxRetries })
              : t('proximitySelection.errors.loadingRoom')
            }
          </p>
          {retryCount >= maxRetries && (
            <Button onClick={handleGoBack} variant="outline">
              {t('proximitySelection.errors.backToHome')}
            </Button>
          )}
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

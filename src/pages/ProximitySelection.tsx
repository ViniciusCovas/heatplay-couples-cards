
import { useEffect, useState } from 'react';
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

  // Handle room joining for non-creators or load room data for creators
  useEffect(() => {
    const handleRoomAccess = async () => {
      if (!roomCode || !isSystemReady) return;
      
      try {
        // Check if we already have room data
        if (room && room.room_code === roomCode) {
          setIsRoomLoaded(true);
          return;
        }
        
        if (isCreator) {
          // For creators, just load room data directly
          const { data: roomData } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('room_code', roomCode)
            .single();
            
          if (roomData) {
            logger.debug('Room data loaded for creator', { roomData });
            setIsRoomLoaded(true);
          }
        } else {
          // For joiners, attempt to join the room
          logger.debug('Attempting to join room for non-creator', { roomCode });
          const success = await joinRoom(roomCode);
          if (success) {
            setIsRoomLoaded(true);
          } else {
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
      }
    };
    
    handleRoomAccess();
  }, [roomCode, isSystemReady, room, isCreator]);

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
  if (!isSystemReady || !isRoomLoaded || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>
            {!isSystemReady
              ? "Initializing player..."
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

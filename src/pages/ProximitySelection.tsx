
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
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { gameState } = useGameSync(room?.id || null, playerId);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Room joining is now handled by centralized useRoomManager in App.tsx

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

  // Room joining is now handled by centralized useRoomManager in App.tsx

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

  // Show loading if system isn't ready, room isn't loaded
  if (!isSystemReady || !room || participants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>
            {!isSystemReady
              ? "Initializing player..."
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

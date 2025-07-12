import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoomService } from '@/hooks/useRoomService';
import { useGameSync } from '@/hooks/useGameSync';
import { usePlayerId } from '@/hooks/usePlayerId';
import { ProximitySelector } from '@/components/game/ProximitySelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ProximitySelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const { room, participants } = useRoomService();
  const playerId = usePlayerId();
  const { gameState } = useGameSync(room?.id || null, playerId);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
  }, [roomCode, navigate]);

  useEffect(() => {
    // Navigate to level select when proximity question is answered
    if (gameState?.proximity_question_answered && gameState?.current_phase === 'level-select') {
      navigate(`/level-select?room=${roomCode}`);
    }
  }, [gameState, navigate, roomCode]);

  const handleProximitySelect = (isClose: boolean) => {
    console.log('Proximity selected:', isClose);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6">
          <p>Cargando sala...</p>
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
          Volver al inicio
        </Button>
        <div className="text-sm text-muted-foreground">
          Sala: {room.room_code} | Jugadores: {participants.length}/2
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ProximitySelector
            isVisible={true}
            onSelect={handleProximitySelect}
            roomCode={roomCode}
          />
        </div>
      </div>
    </div>
  );
};

export default ProximitySelection;
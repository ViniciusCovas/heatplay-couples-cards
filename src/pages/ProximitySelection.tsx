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

const ProximitySelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const { room, participants, joinRoom, isConnected } = useRoomService();
  const playerId = usePlayerId();
  const { gameState } = useGameSync(room?.id || null, playerId);
  const { toast } = useToast();

  // Auto-join room state
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
  }, [roomCode, navigate]);

  // Auto-join room if we have a roomCode but aren't connected
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    const autoJoinRoom = async () => {
      if (roomCode && !isConnected && !room && retryCount < maxRetries) {
        console.log(`🔗 Auto-joining room attempt ${retryCount + 1}:`, roomCode);
        setIsRetrying(true);
        
        try {
          const success = await joinRoom(roomCode);
          if (success) {
            console.log('✅ Successfully joined room');
            setRetryCount(0);
            setIsRetrying(false);
          } else {
            console.log(`❌ Failed to join room (attempt ${retryCount + 1})`);
            setRetryCount(prev => prev + 1);
            
            // Retry after 2 seconds
            if (retryCount + 1 < maxRetries) {
              retryTimeout = setTimeout(() => {
                setIsRetrying(false);
              }, 2000);
            } else {
              setIsRetrying(false);
              toast({
                title: "Error de conexión",
                description: `No se pudo conectar a la sala ${roomCode} después de ${maxRetries} intentos`,
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error(`❌ Auto-join error (attempt ${retryCount + 1}):`, error);
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
          
          if (retryCount + 1 >= maxRetries) {
            toast({
              title: "Error de conexión",
              description: "No se pudo conectar a la sala. Verifica el código de la sala.",
              variant: "destructive"
            });
          }
        }
      }
    };
    
    autoJoinRoom();
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomCode, isConnected, room, joinRoom, retryCount]);

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

  // Show loading if we don't have room yet or are retrying
  if (!room || isRetrying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p>{isRetrying ? `Conectando a la sala... (Intento ${retryCount + 1}/${maxRetries})` : 'Cargando sala...'}</p>
          {retryCount >= maxRetries && (
            <Button onClick={handleGoBack} variant="outline">
              Volver al inicio
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
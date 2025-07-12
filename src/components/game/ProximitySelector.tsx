import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mic, Gamepad2, Clock } from "lucide-react";
import { useGameSync } from "@/hooks/useGameSync";
import { useRoomService } from "@/hooks/useRoomService";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ProximitySelectorProps {
  isVisible: boolean;
  onSelect: (isClose: boolean) => void;
  roomCode: string | null;
}

export const ProximitySelector = ({ isVisible, onSelect, roomCode }: ProximitySelectorProps) => {
  const navigate = useNavigate();
  const { room } = useRoomService();
  const playerId = usePlayerId();
  const { gameState, syncAction, updateGameState } = useGameSync(room?.id || null, playerId);
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  // Handle partner's response
  useEffect(() => {
    if (gameState?.proximity_question_answered && gameState?.current_phase === 'level-select') {
      // Both players answered, navigate to level select
      navigate(`/level-select?room=${roomCode}`);
    }
  }, [gameState, navigate, roomCode]);

  const handleSelect = async (isClose: boolean) => {
    console.log('🔥 handleSelect called with:', isClose);
    
    if (!room?.id || !playerId) {
      console.log('❌ No room ID or player ID available');
      return;
    }
    
    setSelectedOption(isClose);
    setWaitingForPartner(true);
    console.log('🔥 State updated, calling updateGameState...');

    try {
      // Actualiza el estado del juego. La sincronización se hará a través 
      // de la suscripción de Supabase a los cambios en la tabla 'game_rooms'.
      await updateGameState({
        proximity_response: isClose,
        proximity_question_answered: true,
        current_phase: 'level-select'
      });
      
      console.log('🔥 updateGameState completed');

      // La navegación ahora se basará en el cambio de estado del juego, 
      // que se recibe a través del hook useGameSync.
    } catch (error) {
      console.error('❌ Error handling proximity selection:', error);
      setWaitingForPartner(false);
    }
  };

  console.log('🎯 ProximitySelector render:', { 
    isVisible, 
    roomCode, 
    room: room?.id, 
    playerId, 
    gameState, 
    waitingForPartner 
  });

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-8 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Gaming Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse border-2 border-background"></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ¿Cómo van a jugar?
            </h1>
            <p className="text-muted-foreground mt-2">
              Selecciona tu modalidad de juego
            </p>
          </div>
        </div>

        {/* Waiting State */}
        {waitingForPartner ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-heading text-foreground mb-2">
              Respuesta enviada ✓
            </h3>
            <p className="text-sm text-muted-foreground">
              Esperando a tu pareja...
            </p>
            <div className="flex justify-center space-x-2 mt-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Close Option */}
            <div 
              onClick={() => handleSelect(true)}
              className="group relative p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border-2 border-green-500/20 hover:border-green-500/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading text-foreground group-hover:text-green-600 transition-colors">
                    Están juntos 💕
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Respuestas habladas • Más íntimo • Cara a cara
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-green-500/30 group-hover:border-green-500 group-hover:bg-green-500/20 transition-all"></div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Far Option */}
            <div 
              onClick={() => handleSelect(false)}
              className="group relative p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading text-foreground group-hover:text-purple-600 transition-colors">
                    Están separados 📱
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Respuestas escritas • A distancia • Por chat
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 group-hover:border-purple-500 group-hover:bg-purple-500/20 transition-all"></div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>
        )}

        {/* Gaming Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Preparándose para conectar...</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
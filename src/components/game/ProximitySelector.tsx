import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mic, Gamepad2, Clock, Check } from "lucide-react";
import { useGameSync } from "@/hooks/useGameSync";
import { useRoomService } from "@/hooks/useRoomService";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ProximitySelectorProps {
  isVisible: boolean;
  onSelect: (isClose: boolean) => void;
  roomCode: string | null;
  room: any; // Add room as a prop
}

export const ProximitySelector = ({ isVisible, onSelect, roomCode, room }: ProximitySelectorProps) => {
  const navigate = useNavigate();
  const playerId = usePlayerId();
  const { gameState, syncAction, updateGameState } = useGameSync(room?.id || null, playerId);
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { t } = useTranslation();

  // Handle automatic navigation when someone has answered
  useEffect(() => {
    console.log('🔍 ProximitySelector useEffect:', { 
      gameState, 
      proximity_answered: gameState?.proximity_question_answered,
      current_phase: gameState?.current_phase 
    });
    
    // Navigate when someone has answered
    if (gameState?.proximity_question_answered && gameState?.current_phase === 'level-select') {
      console.log('🎯 Someone answered, navigating to level select...');
      navigate(`/level-select?room=${roomCode}`);
    }
  }, [gameState, navigate, roomCode]);

  const handleSelect = (isClose: boolean) => {
    console.log('🎯 ProximitySelector option selected:', { isClose });
    setSelectedOption(isClose);
  };

  const handleConfirm = async () => {
    console.log('🔍 Debug handleConfirm values:', { 
      selectedOption, 
      roomId: room?.id, 
      playerId,
      roomObject: room 
    });
    
    if (selectedOption === null || !room?.id || !playerId) {
      console.error('❌ Missing selection, room ID or player ID', {
        selectedOption,
        roomId: room?.id,
        playerId,
        room
      });
      return;
    }
    
    console.log('🎯 ProximitySelector handleConfirm:', { selectedOption, roomId: room?.id, playerId });
    
    setIsConfirmed(true);
    setWaitingForPartner(true);

    try {
      // Update game state in database
      console.log('📝 Updating game state...');
      await updateGameState({
        proximity_response: selectedOption,
        proximity_question_answered: true,
        current_phase: 'level-select'
      });
      
      // Send sync action to notify other player
      console.log('🔄 Sending sync action...');
      await syncAction('proximity_answer', { isClose: selectedOption });
      
      console.log('✅ Proximity selection confirmed successfully');
      
    } catch (error) {
      console.error('❌ Error confirming proximity selection:', error);
      setWaitingForPartner(false);
      setIsConfirmed(false);
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
    <div className="w-full max-w-md mx-auto space-y-6 p-4">
      <Card className="w-full p-8 space-y-8 animate-scale-in romantic-card border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Romantic Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse border-2 border-background"></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('proximitySelector.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('proximitySelector.subtitle')}
            </p>
          </div>
        </div>

        {/* Waiting State */}
        {waitingForPartner ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-heading text-foreground mb-2">
              {t('proximitySelector.confirmed')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('proximitySelector.advancing')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Together Option */}
            <div 
              onClick={() => handleSelect(true)}
              className={`group relative p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20 ${
                selectedOption === true 
                  ? 'border-green-500 bg-green-500/20 scale-[1.02]' 
                  : 'border-green-500/20 hover:border-green-500/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading text-foreground group-hover:text-green-600 transition-colors">
                    {t('proximitySelector.together.title')} {t('proximitySelector.together.emoji')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('proximitySelector.together.subtitle')}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedOption === true 
                    ? 'border-green-500 bg-green-500 flex items-center justify-center' 
                    : 'border-green-500/30 group-hover:border-green-500 group-hover:bg-green-500/20'
                }`}>
                  {selectedOption === true && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Apart Option */}
            <div 
              onClick={() => handleSelect(false)}
              className={`group relative p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 ${
                selectedOption === false 
                  ? 'border-purple-500 bg-purple-500/20 scale-[1.02]' 
                  : 'border-purple-500/20 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading text-foreground group-hover:text-purple-600 transition-colors">
                    {t('proximitySelector.apart.title')} {t('proximitySelector.apart.emoji')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('proximitySelector.apart.subtitle')}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedOption === false 
                    ? 'border-purple-500 bg-purple-500 flex items-center justify-center' 
                    : 'border-purple-500/30 group-hover:border-purple-500 group-hover:bg-purple-500/20'
                }`}>
                  {selectedOption === false && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            {/* Confirm Button */}
            {selectedOption !== null && !isConfirmed && (
              <div className="pt-4">
                <Button 
                  onClick={handleConfirm}
                  className="w-full h-14 text-lg font-heading btn-gradient-primary"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {t('proximitySelector.confirm')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Romantic Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t('proximitySelector.preparing')}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
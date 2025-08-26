import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mic, Gamepad2, Clock, Check } from "lucide-react";
import { Logo } from "@/components/ui/animated-logo";
import { useGameSync } from "@/hooks/useGameSync";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface ProximitySelectorProps {
  isVisible: boolean;
  onSelect: (isClose: boolean) => void;
  roomCode: string | null;
  room: any;
  participants: any[]; // Add participants as a prop
}

export const ProximitySelector = ({ isVisible, onSelect, roomCode, room, participants }: ProximitySelectorProps) => {
  const navigate = useNavigate();
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { gameState, syncAction, updateGameState } = useGameSync(room?.id || null, playerId);
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { t } = useTranslation();

  // Handle automatic navigation when phase changes to level-selection
  useEffect(() => {
    logger.debug('ProximitySelector state check', { 
      current_phase: gameState?.current_phase,
      isConfirmed,
      waitingForPartner
    });
    
    // Navigate immediately when phase advances to level-selection
    if (gameState?.current_phase === 'level-selection') {
      logger.debug('Phase advanced to level-selection, navigating both players');
      // Add small delay to ensure UI state is clean before navigation
      setTimeout(() => {
        navigate(`/level-select?room=${roomCode}`);
      }, 500);
    }
  }, [gameState?.current_phase, navigate, roomCode, isConfirmed, waitingForPartner]);

  // Fallback navigation mechanism if real-time sync fails
  useEffect(() => {
    if (!isConfirmed || !room?.id) return;
    
    const fallbackCheck = setTimeout(async () => {
      try {
        // Direct database check as fallback
        const { data: roomData, error } = await supabase
          .from('game_rooms')
          .select('current_phase')
          .eq('id', room.id)
          .single();
          
        if (!error && roomData?.current_phase === 'level-selection') {
          logger.debug('Fallback navigation triggered - phase is level-selection');
          navigate(`/level-select?room=${roomCode}`);
        }
      } catch (error) {
        logger.warn('Fallback navigation check failed', error);
      }
    }, 3000); // 3 second fallback
    
    return () => clearTimeout(fallbackCheck);
  }, [isConfirmed, room?.id, roomCode, navigate]);

  // Get current player number for individual response tracking
  const currentPlayerNumber = participants.find(p => p.player_id === playerId)?.player_number;

  const handleSelect = (isClose: boolean) => {
    logger.debug('ProximitySelector option selected', { isClose });
    setSelectedOption(isClose);
  };

  const handleConfirm = async () => {
    logger.debug('ProximitySelector confirm started', { 
      selectedOption, 
      roomId: room?.id, 
      playerId,
      currentPlayerNumber
    });
    
    if (selectedOption === null || !room?.id || !playerId) {
      logger.error('Missing selection, room ID or player ID', {
        selectedOption,
        roomId: room?.id,
        playerId
      });
      return;
    }
    
    setIsConfirmed(true);
    setWaitingForPartner(true);

    try {
      // Use atomic database function to handle proximity response
      const { data: result, error } = await supabase.rpc('handle_proximity_response', {
        room_id_param: room.id,
        player_id_param: playerId,
        is_close_param: selectedOption
      });
      
      if (error) {
        logger.error('Database proximity response failed', error);
        setWaitingForPartner(false);
        setIsConfirmed(false);
        return;
      }
      
      logger.debug('Proximity response result', result);
      
      // Type guard and validation for result
      const proximityResult = result as any;
      
      if (!proximityResult || !proximityResult.success) {
        logger.error('Proximity response failed', proximityResult?.error || 'Unknown error');
        setWaitingForPartner(false);
        setIsConfirmed(false);
        return;
      }
      
      // Send sync action to notify other player
      await syncAction('proximity_answer', { 
        isClose: selectedOption, 
        playerNumber: proximityResult.player_number,
        playerId,
        singlePlayerAdvancement: proximityResult.single_player_advancement
      });
      
      // Database has already advanced the phase immediately
      // The useEffect will handle navigation when gameState updates
      logger.debug('Single player responded - database advanced to level selection immediately');
      
    } catch (error) {
      logger.error('Error confirming proximity selection', error);
      setWaitingForPartner(false);
      setIsConfirmed(false);
    }
  };

  logger.debug('ProximitySelector render', { 
    isVisible, 
    roomCode, 
    roomId: room?.id, 
    playerId, 
    waitingForPartner 
  });

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-4">
      <Card className="w-full p-8 space-y-8 animate-scale-in romantic-card border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Romantic Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-primary/20">
              <Logo size="small" className="scale-75" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse border-2 border-background"></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-brand bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
            <h3 className="text-lg font-brand text-foreground mb-2">
              {t('proximitySelector.confirmed')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('proximitySelector.advancing')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show loading if participants aren't loaded yet */}
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-brand text-foreground mb-2">
                  {t('proximitySelector.loading')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('proximitySelector.waitingConnection')}
                </p>
              </div>
            ) : (
              <>
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
                  <h3 className="text-lg font-brand text-foreground group-hover:text-green-600 transition-colors">
                    {t('proximitySelector.together.title')} {t('proximitySelector.together.emoji')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Together (spoken responses face to face)
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
                  <h3 className="text-lg font-brand text-foreground group-hover:text-purple-600 transition-colors">
                    {t('proximitySelector.apart.title')} {t('proximitySelector.apart.emoji')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Apart (written responses via chat)
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
                      className="w-full h-14 text-lg font-brand btn-gradient-primary"
                      size="lg"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      {t('proximitySelector.confirm')}
                    </Button>
                  </div>
                )}
              </>
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
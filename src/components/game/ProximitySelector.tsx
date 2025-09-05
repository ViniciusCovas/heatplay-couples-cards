import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mic, Gamepad2, Clock, Check } from "lucide-react";
import { Logo } from "@/components/ui/animated-logo";
import { useGameSync } from "@/hooks/useGameSync";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
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
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { t } = useTranslation();

  // Auto-select "Together" mode - no user interaction needed
  const selectedOption = true;

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

  const handleConfirm = useCallback(async () => {
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
  }, [selectedOption, room?.id, playerId, currentPlayerNumber, syncAction]);

  // Auto-confirm when participants are loaded and we haven't confirmed yet
  useEffect(() => {
    if (participants.length > 0 && !isConfirmed && !waitingForPartner) {
      handleConfirm();
    }
  }, [participants.length, isConfirmed, waitingForPartner, handleConfirm]);

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
              <div className="text-center py-8">
                {/* Auto-selecting Together mode - show confirmation */}
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-brand text-foreground mb-2">
                  {t('proximitySelector.together.title')} Mode Selected
                </h3>
                <p className="text-sm text-muted-foreground">
                  Starting together mode automatically...
                </p>
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
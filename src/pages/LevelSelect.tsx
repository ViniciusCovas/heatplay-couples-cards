import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Lock, Heart, MessageCircle, Flame, AlertTriangle, Timer, Users } from "lucide-react";
import * as LucideReact from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGameSync } from "@/hooks/useGameSync";
import { useRoomService } from "@/hooks/useRoomService";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useLevelSelection } from "@/hooks/useLevelSelection";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/animated-logo";
import { logger } from "@/utils/logger";

const LevelSelect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const roomCode = searchParams.get('room');
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const { room, getPlayerNumber, joinRoom, syncRoomState, isConnected } = useRoomService();
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { syncAction } = useGameSync(room?.id || null, playerId);
  // Remove unused imports and methods since we're now fully automatic
  const { submitLevelVote, isWaitingForPartner, agreedLevel, hasVoted, selectedLevel: votedLevel, countdown, levelsMismatch, tryAgain, forceSync } = useLevelSelection(room?.id || null, playerId);
  const [progress] = useState(0); // This will come from game state later
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const playerNumber = getPlayerNumber();

  // Debug information
  logger.debug('LevelSelect Debug:', {
    roomCode,
    room: room?.id,
    isConnected,
    playerId,
    playerNumber,
    currentLanguage: i18n.language,
    browserLanguage: navigator.language,
    detectedLanguage: i18n.language
  });

  // Database levels state
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMismatchAnimation, setShowMismatchAnimation] = useState(false);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Fetch levels from database
  useEffect(() => {
    const fetchLevels = async () => {
      logger.debug('Starting level fetch for Player ID:', playerId, 'Language:', i18n.language);
      setLoading(true);
      
      try {
        logger.debug('Fetching levels for language:', i18n.language);
        const { data: levelsData, error: levelsError } = await supabase
          .from('levels')
          .select('*')
          .eq('is_active', true)
          .eq('language', i18n.language)
          .order('sort_order');

        logger.debug('Levels query result:', { 
          levelsData, 
          levelsError, 
          count: levelsData?.length,
          playerId,
          language: i18n.language 
        });

        if (levelsError) {
          logger.error('Database error fetching levels:', levelsError);
          throw levelsError;
        }

        if (!levelsData || levelsData.length === 0) {
          logger.warn('No levels found for language:', i18n.language);
          throw new Error('No levels found');
        }

        // Get question counts for each level with better error handling
        const levelsWithCounts = await Promise.all(
          levelsData.map(async (level) => {
            try {
              const { count, error: countError } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('level_id', level.id)
                .eq('language', i18n.language)
                .eq('is_active', true);

              if (countError) {
                logger.warn('Error getting question count for level:', level.id, countError);
              }

              // Check if icon is emoji or lucide icon name
              const getIconDisplay = (iconStr: string) => {
                if (!iconStr) return { type: 'lucide', component: Heart, emoji: null };
                
                // Check if it's an emoji (contains non-ASCII characters or common emoji patterns)
                const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|❤️|💖|🔥|💪|⚡|🎯|💎|🌟/u.test(iconStr);
                
                if (isEmoji) {
                  return { type: 'emoji', component: null, emoji: iconStr };
                } else {
                  // Try to find the icon in lucide-react
                  const iconName = iconStr.replace(/[^a-zA-Z]/g, '');
                  const component = (LucideReact as any)[iconName] || Heart;
                  return { type: 'lucide', component, emoji: null };
                }
              };

              const iconDisplay = getIconDisplay(level.icon || '');

              return {
                id: level.sort_order, // Use sort_order as id for compatibility
                title: level.name,
                description: level.description || '',
                iconDisplay,
                color: level.color ? `text-[${level.color}]` : "text-primary",
                bgColor: level.bg_color || "bg-primary/10",
                cards: count || 0,
                database_id: level.id // Keep reference to actual database ID
              };
            } catch (levelError) {
              logger.error('Error processing level:', level.id, levelError);
              // Return fallback for this level
              return {
                id: level.sort_order,
                title: level.name || 'Level',
                description: level.description || 'Connection level',
                iconDisplay: { type: 'lucide', component: Heart, emoji: null },
                color: "text-primary",
                bgColor: "bg-primary/10",
                cards: 5,
                database_id: level.id
              };
            }
          })
        );

        logger.debug('Final levels with counts:', levelsWithCounts);
        
        if (levelsWithCounts.length === 0) {
          throw new Error('No processed levels available');
        }
        
        setLevels(levelsWithCounts);
        
      } catch (error) {
        logger.error('Error fetching levels - using fallback:', error);
        
        // Comprehensive fallback levels to ensure UI always works
        const fallbackLevels = [
          {
            id: 1,
            title: t('level.spark.title', 'Spark'),
            description: t('level.spark.description', 'Light conversation starters'),
            iconDisplay: { type: 'emoji', component: null, emoji: '✨' },
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
            cards: 10
          },
          {
            id: 2,
            title: t('level.connection.title', 'Connection'),
            description: t('level.connection.description', 'Deeper personal sharing'),
            iconDisplay: { type: 'lucide', component: Heart, emoji: null },
            color: "text-pink-600",
            bgColor: "bg-pink-100",
            cards: 15
          },
          {
            id: 3,
            title: t('level.fire.title', 'Fire'),
            description: t('level.fire.description', 'Intimate and meaningful topics'),
            iconDisplay: { type: 'emoji', component: null, emoji: '🔥' },
            color: "text-red-600",
            bgColor: "bg-red-100",
            cards: 20
          },
          {
            id: 4,
            title: t('level.nofilter.title', 'No Filter'),
            description: t('level.nofilter.description', 'Raw and unfiltered conversation'),
            iconDisplay: { type: 'lucide', component: AlertTriangle, emoji: null },
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            cards: 25
          }
        ];
        
        setLevels(fallbackLevels);
        logger.debug('Set fallback levels:', fallbackLevels);
        
      } finally {
        setLoading(false);
        logger.debug('Level fetching completed for Player ID:', playerId);
      }
    };

    // Only fetch levels when we have both language and playerId
    if (i18n.language && playerId && playerIdReady) {
      fetchLevels();
    } else {
      logger.debug('Waiting for language and playerId before fetching levels:', { 
        language: i18n.language, 
        playerId 
      });
    }
  }, [i18n.language, playerId, playerIdReady, t]);

  // Room connection logic with participant checking
  useEffect(() => {
    if (!roomCode || !playerId || !playerIdReady || isJoining) return;
    
    const handleRoomAccess = async () => {
      logger.debug('LevelSelect - handleRoomAccess called', { 
        roomCode, 
        playerId, 
        isConnected, 
        room: room?.id 
      });
      
      if (isConnected && room && room.room_code === roomCode) {
        logger.debug('Already connected to correct room:', room.id);
        return;
      }
      
      setIsJoining(true);
      
      try {
        // First check if player is already a participant in this room
        logger.debug('Checking if player is already a participant in room:', roomCode);
        const { data: existingParticipant, error: participantError } = await supabase
          .from('room_participants')
          .select('room_id, player_id, player_number')
          .eq('player_id', playerId)
          .eq('room_id', (await supabase
            .from('game_rooms')
            .select('id')
            .eq('room_code', roomCode)
            .single()).data?.id || '')
          .maybeSingle();

        if (participantError && participantError.code !== 'PGRST116') {
          logger.error('Error checking participant status:', participantError);
        }

        if (existingParticipant) {
          // Player is already a participant, use syncRoomState instead of joinRoom
          logger.debug('Player is already a participant, syncing room state');
          const syncSuccess = await syncRoomState(roomCode);
          
          if (syncSuccess) {
            logger.debug('Successfully synced room state');
          } else {
            logger.warn('Sync room state returned false');
            toast({
              title: t('error.title', 'Error'),
              description: t('error.connectionFailed', 'Failed to connect to room'),
              variant: "destructive"
            });
          }
        } else {
          // Player is not a participant, try to join
          logger.debug('Player is not a participant, attempting to join room');
          const joinSuccess = await joinRoom(roomCode);
          
          if (joinSuccess) {
            logger.debug('Successfully joined room');
          } else {
            logger.warn('Join room returned false - may be room full');
            // If join failed due to room being full, try to sync instead
            // This handles the case where the player was already in the room but state was lost
            logger.debug('Join failed, attempting to sync room state as fallback');
            const syncSuccess = await syncRoomState(roomCode);
            
            if (!syncSuccess) {
              toast({
                title: t('error.title', 'Error'),
                description: t('error.roomNotFound', 'Room not found or unable to join'),
                variant: "destructive"
              });
            }
          }
        }
      } catch (error: any) {
        logger.error('Error in handleRoomAccess:', error);
        
        // If we get a "room_full" error, try to sync instead
        if (error?.message?.includes('room_full')) {
          logger.debug('Room full error, attempting to sync room state');
          try {
            const syncSuccess = await syncRoomState(roomCode);
            if (!syncSuccess) {
              toast({
                title: t('error.title', 'Error'),
                description: t('error.roomFull', 'Room is full. Please try a different room.'),
                variant: "destructive"
              });
            }
          } catch (syncError) {
            logger.error('Sync fallback also failed:', syncError);
            toast({
              title: t('error.title', 'Error'),
              description: t('error.connectionFailed', 'Failed to connect to room'),
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: t('error.title', 'Error'),
            description: t('error.connectionFailed', 'Failed to connect to room'),
            variant: "destructive"
          });
        }
      } finally {
        setIsJoining(false);
      }
    };
    
    // Small delay to allow other hooks to initialize
    const timer = setTimeout(handleRoomAccess, 100);
    return () => clearTimeout(timer);
  }, [roomCode, playerId, playerIdReady, isConnected, room, joinRoom, syncRoomState, isJoining, t, toast, supabase]);

  const handleLevelClick = (levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    // All levels are now available - start directly
    startLevel(levelId);
  };

  const startLevel = async (levelId: number) => {
    logger.debug('startLevel called:', { levelId, roomId: room?.id, playerId });
    
    // Check if we're in a stuck state and force sync if needed
    if (isWaitingForPartner || levelsMismatch) {
      logger.debug('Forcing sync before level selection due to stuck state');
      await forceSync();
    }
    
    try {
      await submitLevelVote(levelId);
    } catch (error) {
      logger.error('Error voting for level:', error);
      toast({
        title: t('error.title', 'Error'),
        description: t('error.levelSelectionFailed', 'Failed to select level. Please try again.'),
        variant: "destructive"
      });
    }
  };

  const handleConfirmLockedLevel = () => {
    if (selectedLevel) {
      startLevel(selectedLevel);
    }
    setShowConfirmDialog(false);
    setSelectedLevel(null);
  };

  // Handle match and mismatch animations
  useEffect(() => {
    if (agreedLevel) {
      setShowMatchAnimation(true);
      const timer = setTimeout(() => setShowMatchAnimation(false), 4000);
      return () => clearTimeout(timer);
    } else if (levelsMismatch) {
      setShowMismatchAnimation(true);
      const timer = setTimeout(() => setShowMismatchAnimation(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [agreedLevel, levelsMismatch]);

  // Navigate to game when level is agreed upon
  useEffect(() => {
    if (agreedLevel && room?.id) {
      logger.debug('Level agreed, navigating to game:', { agreedLevel, roomId: room.id });
      const timer = setTimeout(() => {
        navigate(`/game?room=${roomCode}&level=${agreedLevel}`);
      }, 1500); // Reduced time to 1.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [agreedLevel, navigate, roomCode, room?.id]);


  // Room joining is now handled by centralized useRoomManager in App.tsx

  // Show loading or connection status
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t('loading.levels', 'Loading levels...')}</p>
        </div>
      </div>
    );
  }

  if (!playerId || !playerIdReady) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Initializing player...</p>
        </div>
      </div>
    );
  }

  if (roomCode && (!isConnected || !room || isJoining)) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 mx-auto">
            <div className="w-full h-full border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">
            {isJoining 
              ? t('connecting.joining', 'Joining room {{roomCode}}...', { roomCode })
              : t('connecting.room', 'Connecting to room {{roomCode}}...', { roomCode })
            }
          </p>
          <Button onClick={() => navigate('/')}>{t('button.back_home', 'Back to Home')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto space-y-6 flex-1">
        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="medium" className="scale-75" />
          </div>
          <div className="flex items-center justify-center space-x-4 mb-2">
            <p className="text-sm text-muted-foreground">
              Sala: <span className="font-mono font-bold text-primary">{roomCode}</span>
            </p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              <span>Jugador {playerNumber || '?'}</span>
            </div>
          </div>
          {countdown !== null ? (
            <div className="text-center space-y-4">
              <div className={`relative ${showMatchAnimation ? 'animate-pulse' : ''}`}>
                <div className="w-20 h-20 mx-auto rounded-full border-4 border-green-500 flex items-center justify-center bg-green-50 animate-scale-in">
                  <span className="text-3xl font-bold text-green-600">{countdown}</span>
                </div>
                {showMatchAnimation && (
                  <>
                    <Heart className="absolute -top-2 -right-2 w-8 h-8 text-pink-500 animate-heartbeat" />
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute -top-3 left-1/2 w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                    <div className="absolute -right-3 top-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
                  </>
                )}
              </div>
              <p className="text-lg text-green-600 font-medium animate-fade-in">
                💖 You are connected. Let's play! Starting in {countdown}...
              </p>
            </div>
          ) : agreedLevel ? (
            <p className="text-base text-green-600 font-medium">
              ¡Perfecto! Ambos eligieron el nivel {agreedLevel}. Iniciando juego...
            </p>
           ) : levelsMismatch ? (
            <div className={`text-center space-y-4 transition-all duration-500 ${showMismatchAnimation ? 'animate-shake' : ''}`}>
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <AlertTriangle className={`w-6 h-6 ${showMismatchAnimation ? 'animate-bounce' : ''}`} />
                <p className="text-lg font-bold">
                  Different levels selected!
                </p>
              </div>
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-base text-red-700 font-medium mb-2">
                  You selected different levels. You must select the same level to play.
                </p>
                <div className={`w-full max-w-xs mx-auto h-2 bg-red-200 rounded-full overflow-hidden ${showMismatchAnimation ? 'animate-pulse' : ''}`}>
                  <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
                <p className="text-sm text-red-600 mt-2 animate-fade-in">
                  🔄 Resetting automatically... You can select again in a moment.
                </p>
              </div>
            </div>
            ) : isWaitingForPartner ? (
            <div className="flex flex-col items-center justify-center space-y-3 text-orange-600">
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 animate-pulse" />
                <p className="text-base font-medium">
                  Waiting for your partner to select the level...
                </p>
              </div>
              <div className="w-6 h-6 mx-auto">
                <div className="w-full h-full border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={tryAgain}
                className="mt-2 text-xs"
              >
                Reset Selection
              </Button>
            </div>
           ) : (
             <p className="text-base text-muted-foreground">
               {location.pathname.includes('game') ? 'Elige el nuevo nivel de intensidad' : 'Elige tu nivel de intensidad'}
             </p>
           )}
        </div>

        {/* Levels */}
        <div className="space-y-4">
        {levels.map((level) => {
            const isSelected = votedLevel === level.id;
            const isDisabled = !playerId || !playerIdReady || !room?.id || agreedLevel !== null;
            const isWaitingDisabled = isWaitingForPartner || levelsMismatch;
            const isMismatched = levelsMismatch && isSelected;
            
            return (
              <Card 
                key={level.id}
                className={`p-6 transition-all duration-300 border-2 ${
                  isSelected 
                    ? isMismatched
                      ? `border-red-500 bg-red-50 ${showMismatchAnimation ? 'animate-shake border-red-600' : ''}`
                      : agreedLevel === level.id
                        ? `border-green-500 bg-green-50 ${showMatchAnimation ? 'animate-pulse' : ''}`
                        : 'border-primary bg-primary/5'
                    : isDisabled || isWaitingDisabled
                      ? 'opacity-50 border-muted cursor-not-allowed'
                      : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/30'
                }`}
                onClick={() => !isDisabled && !isWaitingDisabled && handleLevelClick(level.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full ${level.bgColor} flex items-center justify-center flex-shrink-0 relative`}>
                    {level.iconDisplay.type === 'emoji' ? (
                      <span className="text-2xl">{level.iconDisplay.emoji}</span>
                    ) : (
                      <level.iconDisplay.component className={`w-6 h-6 ${level.color}`} />
                    )}
                        {isSelected && agreedLevel === level.id && showMatchAnimation && (
                          <>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-ping"></div>
                            <Heart className="absolute -top-2 -left-2 w-4 h-4 text-pink-500 animate-heartbeat" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                          </>
                        )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-heading text-foreground">
                        {level.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {level.cards} cartas
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {level.description}
                    </p>
                    
                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-primary font-medium">
                          ✓ Has elegido este nivel
                        </p>
                        {agreedLevel === level.id && showMatchAnimation && (
                          <Heart className="w-4 h-4 text-pink-500 animate-heartbeat" />
                        )}
                      </div>
                    )}
                    
                    {isMismatched && showMismatchAnimation && (
                      <div className="text-xs text-red-600 font-bold mt-2 animate-pulse flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>⚠️ Different from partner's choice</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Confirmation Dialog for Locked Levels */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Nivel bloqueado
              </AlertDialogTitle>
              <AlertDialogDescription>
                Este nivel está bloqueado porque no has completado el nivel anterior. 
                ¿Estás seguro de que quieres continuar de todos modos? 
                Podrías encontrar preguntas más intensas de las esperadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmLockedLevel}
                className="bg-destructive hover:bg-destructive/90"
              >
                Continuar de todos modos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Connection status indicator */}
        {!room?.id && (
          <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              <Timer className="w-4 h-4 inline-block mr-1" />
              {t('levelSelect.connectingToRoom', 'Connecting to room...')}
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Pueden subir de nivel cuando se sientan listos
          </p>
          <p className="text-xs text-destructive font-medium">
            Recuerden: pueden parar en cualquier momento
          </p>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;
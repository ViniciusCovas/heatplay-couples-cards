import { useState, useEffect, type ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Lock, Heart, MessageCircle, Flame, AlertTriangle, Timer, Users,
  Sparkles, Star, Zap, Sun, Moon, Smile, Gift, Crown, Gem, Coffee,
  Music, Target, Handshake, Eye, Feather, Compass, Key, Lightbulb,
} from "lucide-react";

// Curated icon map instead of `import * as LucideReact` — the namespace
// import defeated tree-shaking and pulled the whole icon library (~700KB)
// into this route's chunk. Unknown names fall back to Heart.
const LEVEL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Lock, Heart, MessageCircle, Flame, AlertTriangle, Timer, Users,
  Sparkles, Star, Zap, Sun, Moon, Smile, Gift, Crown, Gem, Coffee,
  Music, Target, Handshake, Eye, Feather, Compass, Key, Lightbulb,
};

// Tailwind can only generate classes it can see at build time, so level colors
// must come from a static, safelisted palette rather than a runtime DB value.
// Levels are mapped by their sort order into the brand ramp.
const LEVEL_ACCENTS = [
  { color: "text-secondary", bgColor: "bg-secondary/10" },
  { color: "text-primary-ink", bgColor: "bg-primary/10" },
  { color: "text-accent", bgColor: "bg-accent/10" },
  { color: "text-primary", bgColor: "bg-primary/15" },
];

const accentFor = (index: number) => LEVEL_ACCENTS[((index % LEVEL_ACCENTS.length) + LEVEL_ACCENTS.length) % LEVEL_ACCENTS.length];

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
          levelsData.map(async (level, levelIndex) => {
            const accent = accentFor(levelIndex);
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
                  const component = LEVEL_ICONS[iconName] || Heart;
                  return { type: 'lucide', component, emoji: null };
                }
              };

              const iconDisplay = getIconDisplay(level.icon || '');

              return {
                id: level.sort_order, // Use sort_order as id for compatibility
                title: level.name,
                description: level.description || '',
                iconDisplay,
                color: accent.color,
                bgColor: accent.bgColor,
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
                color: accent.color,
                bgColor: accent.bgColor,
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
            color: LEVEL_ACCENTS[0].color,
            bgColor: LEVEL_ACCENTS[0].bgColor,
            cards: 10
          },
          {
            id: 2,
            title: t('level.connection.title', 'Connection'),
            description: t('level.connection.description', 'Deeper personal sharing'),
            iconDisplay: { type: 'lucide', component: Heart, emoji: null },
            color: LEVEL_ACCENTS[1].color,
            bgColor: LEVEL_ACCENTS[1].bgColor,
            cards: 15
          },
          {
            id: 3,
            title: t('level.fire.title', 'Fire'),
            description: t('level.fire.description', 'Intimate and meaningful topics'),
            iconDisplay: { type: 'emoji', component: null, emoji: '🔥' },
            color: LEVEL_ACCENTS[2].color,
            bgColor: LEVEL_ACCENTS[2].bgColor,
            cards: 20
          },
          {
            id: 4,
            title: t('level.nofilter.title', 'No Filter'),
            description: t('level.nofilter.description', 'Raw and unfiltered conversation'),
            iconDisplay: { type: 'lucide', component: AlertTriangle, emoji: null },
            color: LEVEL_ACCENTS[3].color,
            bgColor: LEVEL_ACCENTS[3].bgColor,
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

  // --- Loading / stalled handling (P1-22) -------------------------------
  // A spinner must never be a dead end: there is always a way home, and after
  // 15s a stuck connection turns into an actionable error with a retry.
  const isBusy =
    loading ||
    !playerId ||
    !playerIdReady ||
    Boolean(roomCode && (!isConnected || !room || isJoining));

  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!isBusy) {
      setStalled(false);
      return;
    }
    const timer = setTimeout(() => setStalled(true), 15000);
    return () => clearTimeout(timer);
  }, [isBusy]);

  const handleRetry = () => {
    setStalled(false);
    window.location.reload();
  };

  if (isBusy) {
    const busyMessage = loading
      ? t('loading.levels', 'Loading levels...')
      : !playerId || !playerIdReady
        ? t('levelSelect.initializingPlayer', 'Getting you ready...')
        : isJoining
          ? t('connecting.joining', 'Joining room {{roomCode}}...', { roomCode })
          : t('connecting.room', 'Connecting to room {{roomCode}}...', { roomCode });

    return (
      <div className="min-h-screen romantic-background p-4 flex items-center justify-center">
        <div className="w-full max-w-sm text-center space-y-5">
          {stalled ? (
            <>
              <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-xl font-bold text-foreground">
                  {t('levelSelect.stalled.title', 'This is taking longer than it should')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('levelSelect.stalled.description', 'We could not reach the room. Check your connection and try again.')}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} className="btn-gradient-primary h-11 font-semibold">
                  {t('levelSelect.stalled.retry', 'Try again')}
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  {t('button.back_home', 'Back to Home')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 mx-auto motion-reduce:hidden">
                <div className="w-full h-full border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-muted-foreground">{busyMessage}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                {t('button.back_home', 'Back to Home')}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen romantic-background p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto space-y-6 flex-1">
        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="medium" className="scale-75" />
          </div>
          <div className="flex items-center justify-center space-x-4 mb-2">
            <p className="text-sm text-muted-foreground">
              {t('levelSelect.roomLabel', 'Room')}:{' '}
              <span className="font-mono font-bold text-primary-ink">{roomCode}</span>
            </p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              <span>{t('levelSelect.playerLabel', 'Player {{number}}', { number: playerNumber || '?' })}</span>
            </div>
          </div>
          {countdown !== null ? (
            <div className="text-center space-y-4">
              <div className={`relative ${showMatchAnimation ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
                <div className="w-20 h-20 mx-auto rounded-full border-4 border-primary flex items-center justify-center bg-primary/10 animate-scale-in">
                  <span className="text-3xl font-bold text-primary-ink">{countdown}</span>
                </div>
                {showMatchAnimation && (
                  <>
                    <Heart className="absolute -top-2 -right-2 w-8 h-8 text-primary animate-heartbeat motion-reduce:animate-none" />
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full animate-ping motion-reduce:hidden"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-accent rounded-full animate-ping motion-reduce:hidden" style={{ animationDelay: '0.5s' }}></div>
                  </>
                )}
              </div>
              <p className="text-lg text-primary-ink font-medium animate-fade-in">
                {t('levelSelect.matched', "💖 You're connected. Starting in {{count}}...", { count: countdown })}
              </p>
            </div>
          ) : agreedLevel ? (
            <p className="text-base text-primary-ink font-medium">
              {t('levelSelect.agreed', 'Perfect! You both picked level {{level}}. Starting the game...', { level: agreedLevel })}
            </p>
           ) : levelsMismatch ? (
            <div className={`text-center space-y-4 transition-all duration-500 ${showMismatchAnimation ? 'animate-shake motion-reduce:animate-none' : ''}`}>
              <div className="flex items-center justify-center space-x-2 text-destructive">
                <AlertTriangle className={`w-6 h-6 ${showMismatchAnimation ? 'animate-bounce motion-reduce:animate-none' : ''}`} />
                <p className="text-lg font-bold">
                  {t('levelSelect.mismatch.title', 'You picked different levels')}
                </p>
              </div>
              <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg">
                <p className="text-base text-destructive font-medium mb-2">
                  {t('levelSelect.mismatch.description', 'You need to choose the same level to play together.')}
                </p>
                <div className={`w-full max-w-xs mx-auto h-2 bg-destructive/20 rounded-full overflow-hidden ${showMismatchAnimation ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
                  <div className="h-full bg-destructive rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-sm text-destructive mt-2 animate-fade-in">
                  {t('levelSelect.mismatch.resetting', 'Resetting automatically — you can choose again in a moment.')}
                </p>
              </div>
            </div>
            ) : isWaitingForPartner ? (
            <div className="flex flex-col items-center justify-center space-y-3 text-secondary">
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
                <p className="text-base font-medium">
                  {t('levelSelect.waitingPartner', 'Waiting for your partner to pick a level...')}
                </p>
              </div>
              <div className="w-6 h-6 mx-auto motion-reduce:hidden">
                <div className="w-full h-full border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={tryAgain}
                className="mt-2 text-xs"
              >
                {t('levelSelect.resetSelection', 'Reset selection')}
              </Button>
            </div>
           ) : (
             <p className="text-base text-muted-foreground">
               {location.pathname.includes('game')
                 ? t('levelSelect.chooseNewIntensity', 'Choose your new intensity level')
                 : t('levelSelect.chooseIntensity', 'Choose your intensity level')}
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
            const isInteractive = !isDisabled && !isWaitingDisabled;

            return (
              <Card 
                key={level.id}
                role="button"
                tabIndex={isInteractive ? 0 : -1}
                aria-pressed={isSelected}
                aria-disabled={!isInteractive}
                className={`p-6 transition-all duration-300 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isSelected 
                    ? isMismatched
                      ? `border-destructive bg-destructive/10 ${showMismatchAnimation ? 'animate-shake motion-reduce:animate-none' : ''}`
                      : agreedLevel === level.id
                        ? `border-primary bg-primary/10 ${showMatchAnimation ? 'animate-pulse motion-reduce:animate-none' : ''}`
                        : 'border-primary bg-primary/5'
                    : !isInteractive
                      ? 'opacity-60 border-muted cursor-not-allowed'
                      : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/30'
                }`}
                onClick={() => isInteractive && handleLevelClick(level.id)}
                onKeyDown={(e) => {
                  if (!isInteractive) return;
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    handleLevelClick(level.id);
                  }
                }}
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
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping motion-reduce:hidden"></div>
                            <Heart className="absolute -top-2 -left-2 w-4 h-4 text-primary animate-heartbeat motion-reduce:animate-none" />
                          </>
                        )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-heading text-foreground">
                        {level.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {t('levelSelect.cardCount', '{{count}} cards', { count: level.cards })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {level.description}
                    </p>
                    
                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-primary-ink font-medium">
                          ✓ {t('levelSelect.youChose', 'You chose this level')}
                        </p>
                        {agreedLevel === level.id && showMatchAnimation && (
                          <Heart className="w-4 h-4 text-primary animate-heartbeat motion-reduce:animate-none" />
                        )}
                      </div>
                    )}
                    
                    {isMismatched && showMismatchAnimation && (
                      <div className="text-xs text-destructive font-bold mt-2 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{t('levelSelect.mismatch.card', "Different from your partner's choice")}</span>
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
                {t('levelSelect.lockedDialog.title', 'Level locked')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('levelSelect.lockedDialog.description', "This level is locked because you haven't finished the previous one. Are you sure you want to continue anyway? The questions may be more intense than you expect.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                {t('levelSelect.lockedDialog.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmLockedLevel}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('levelSelect.lockedDialog.confirm', 'Continue anyway')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Connection status indicator */}
        {!room?.id && (
          <div className="text-center p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
            <p className="text-sm text-secondary">
              <Timer className="w-4 h-4 inline-block mr-1" />
              {t('levelSelect.connectingToRoom', 'Connecting to room...')}
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            {t('levelSelect.tip', '💡 Tip: you can move up a level whenever you both feel ready')}
          </p>
          <p className="text-sm text-destructive font-medium">
            {t('levelSelect.stopAnytime', 'Remember: you can stop at any time')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;

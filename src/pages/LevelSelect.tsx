import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Lock, Heart, MessageCircle, Flame, AlertTriangle, Timer, Users } from "lucide-react";
import * as LucideReact from "lucide-react";
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

const LevelSelect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const roomCode = searchParams.get('room');
  const { room, getPlayerNumber, joinRoom, isConnected } = useRoomService();
  const playerId = usePlayerId();
  const { syncAction } = useGameSync(room?.id || null, playerId);
  // Remove unused imports and methods since we're now fully automatic
  const { submitLevelVote, isWaitingForPartner, agreedLevel, hasVoted, selectedLevel: votedLevel, countdown, bothPlayersVoted, levelsMismatch } = useLevelSelection(room?.id || null, playerId);
  const [progress] = useState(0); // This will come from game state later
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const playerNumber = getPlayerNumber();

  // Debug information
  console.log('📊 LevelSelect Debug:', {
    roomCode,
    room: room?.id,
    isConnected,
    playerId,
    playerNumber
  });

  // Database levels state
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMismatchAnimation, setShowMismatchAnimation] = useState(false);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);

  // Fetch levels from database
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const { data: levelsData, error: levelsError } = await supabase
          .from('levels')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (levelsError) throw levelsError;

        // Get question counts for each level
        const levelsWithCounts = await Promise.all(
          levelsData.map(async (level) => {
            const { count } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('level_id', level.id)
              .eq('is_active', true);

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

            const iconDisplay = getIconDisplay(level.icon);

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
          })
        );

        setLevels(levelsWithCounts);
      } catch (error) {
        console.error('Error fetching levels:', error);
        // Fallback to default levels if database fails
        setLevels([
          {
            id: 1,
            title: "Básico",
            description: "Preguntas simples para conocerse mejor",
            icon: Heart,
            color: "text-primary",
            bgColor: "bg-primary/10",
            cards: 5
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, []);

  const handleLevelClick = (levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    // All levels are now available - start directly
    startLevel(levelId);
  };

  const startLevel = async (levelId: number) => {
    console.log('🚀 startLevel called:', { levelId, roomId: room?.id, playerId });
    
    try {
      await submitLevelVote(levelId);
    } catch (error) {
      console.error('❌ Error voting for level:', error);
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
      console.log('🚀 Level agreed, navigating to game:', { agreedLevel, roomId: room.id });
      const timer = setTimeout(() => {
        navigate(`/game?room=${roomCode}&level=${agreedLevel}`);
      }, 1500); // Reduced time to 1.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [agreedLevel, navigate, roomCode, room?.id]);


  // Auto-join room if not connected
  useEffect(() => {
    if (roomCode && !isConnected && !room) {
      console.log('🔗 Auto-joining room from LevelSelect:', roomCode);
      joinRoom(roomCode);
    }
  }, [roomCode, isConnected, room, joinRoom]);

  // Show loading or connection status
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Cargando niveles...</p>
        </div>
      </div>
    );
  }

  if (roomCode && !isConnected && !room) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Conectando a la sala {roomCode}...</p>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
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
            <Heart className="w-6 h-6 text-secondary mr-2" />
            <h1 className="text-2xl font-heading text-foreground">Cartas Íntimas</h1>
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
            const isDisabled = isWaitingForPartner || agreedLevel !== null || levelsMismatch;
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
                    : isDisabled
                      ? 'opacity-50 border-muted cursor-not-allowed'
                      : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/30'
                }`}
                onClick={() => !isDisabled && handleLevelClick(level.id)}
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
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Heart, MessageCircle, Flame, AlertTriangle } from "lucide-react";
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

const LevelSelect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const { room } = useRoomService();
  const playerId = usePlayerId();
  const { syncAction } = useGameSync(room?.id || null, playerId);
  const [progress] = useState(0); // This will come from game state later
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const levels = [
    {
      id: 1,
      title: "Descubrimiento",
      description: "Conocerse mejor, romper el hielo",
      icon: Heart,
      color: "text-primary",
      bgColor: "bg-primary/10",
      unlocked: true,
      cards: 15
    },
    {
      id: 2,
      title: "Confianza",
      description: "Preguntas más profundas e íntimas",
      icon: MessageCircle,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      unlocked: progress >= 0.7,
      cards: 20
    },
    {
      id: 3,
      title: "Sin filtros",
      description: "Máxima conexión y sinceridad",
      icon: Flame,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      unlocked: progress >= 1.5,
      cards: 12
    }
  ];

  const handleLevelClick = (levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    if (level.unlocked) {
      // Level is unlocked, start directly
      startLevel(levelId);
    } else {
      // Level is locked, show confirmation dialog
      setSelectedLevel(levelId);
      setShowConfirmDialog(true);
    }
  };

  const startLevel = async (levelId: number) => {
    try {
      // Sync with partner that we're starting this level
      await syncAction('level_change', { level: levelId, roomCode });
      navigate(`/game?room=${roomCode}&level=${levelId}`);
    } catch (error) {
      console.error('Error starting level:', error);
    }
  };

  const handleConfirmLockedLevel = () => {
    if (selectedLevel) {
      startLevel(selectedLevel);
    }
    setShowConfirmDialog(false);
    setSelectedLevel(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto space-y-6 flex-1">
        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-secondary mr-2" />
            <h1 className="text-2xl font-heading text-foreground">Cartas Íntimas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sala: <span className="font-mono font-bold text-primary">{roomCode}</span>
          </p>
          <p className="text-base text-muted-foreground">
            Elige tu nivel de intensidad
          </p>
        </div>

        {/* Levels */}
        <div className="space-y-4">
          {levels.map((level) => {
            const IconComponent = level.icon;
            const isLocked = !level.unlocked;
            
            return (
              <Card 
                key={level.id}
                className={`p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/30 ${
                  isLocked ? 'opacity-60 bg-muted/30' : ''
                }`}
                onClick={() => handleLevelClick(level.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full ${level.bgColor} flex items-center justify-center flex-shrink-0`}>
                    {isLocked ? (
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <IconComponent className={`w-6 h-6 ${level.color}`} />
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
                    
                    {isLocked && (
                      <p className="text-xs text-destructive font-medium">
                        Completa el nivel anterior para desbloquear
                      </p>
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
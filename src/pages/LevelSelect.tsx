import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Heart, MessageCircle, Flame } from "lucide-react";

const LevelSelect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const [progress] = useState(0); // This will come from game state later

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

  const handleStartLevel = (levelId: number) => {
    if (levels.find(l => l.id === levelId)?.unlocked) {
      navigate(`/game?room=${roomCode}&level=${levelId}`);
    }
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
                className={`p-6 transition-all duration-200 ${
                  isLocked 
                    ? 'opacity-60 cursor-not-allowed bg-muted/30' 
                    : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/30'
                }`}
                onClick={() => !isLocked && handleStartLevel(level.id)}
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
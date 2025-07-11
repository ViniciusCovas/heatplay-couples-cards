import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, Heart, Flame, Zap, Users, AlertTriangle } from "lucide-react";

interface LevelUpConfirmationProps {
  isVisible: boolean;
  currentLevel: number;
  cardsCompleted: number;
  minimumRecommended: number;
  onConfirm: () => void;
  onCancel: () => void;
  waitingForPartner?: boolean;
}

const LEVEL_INFO = {
  2: {
    name: "Confianza",
    icon: <Flame className="w-6 h-6" />,
    color: "orange",
    description: "Preguntas más profundas sobre sentimientos y experiencias"
  },
  3: {
    name: "Sin filtros", 
    icon: <Zap className="w-6 h-6" />,
    color: "red",
    description: "Preguntas íntimas y atrevidas para máxima conexión"
  }
};

export const LevelUpConfirmation = ({
  isVisible,
  currentLevel,
  cardsCompleted,
  minimumRecommended,
  onConfirm,
  onCancel,
  waitingForPartner = false
}: LevelUpConfirmationProps) => {
  if (!isVisible) return null;

  const nextLevel = currentLevel + 1;
  const levelInfo = LEVEL_INFO[nextLevel as keyof typeof LEVEL_INFO];
  
  if (!levelInfo) return null;

  const isUnderRecommended = cardsCompleted < minimumRecommended;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6 animate-scale-in">
        {waitingForPartner ? (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <Users className="w-12 h-12 mx-auto text-primary mb-4" />
            </div>
            <h2 className="text-xl font-heading">Esperando confirmación</h2>
            <p className="text-muted-foreground">
              Tu pareja también debe confirmar para subir al siguiente nivel
            </p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center
                ${levelInfo.color === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}
              `}>
                {levelInfo.icon}
              </div>
              
              <div>
                <h2 className="text-xl font-heading mb-2">¿Quieren profundizar más?</h2>
                <p className="text-muted-foreground">
                  Subir al nivel {nextLevel}: {levelInfo.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Siguiente nivel:</p>
                <p className="font-medium">{levelInfo.description}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Cartas completadas:</span>
                <span className="font-mono">{cardsCompleted}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Mínimo recomendado:</span>
                <span className="font-mono">{minimumRecommended}</span>
              </div>

              {isUnderRecommended && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Recomendamos completar al menos {minimumRecommended} cartas para una mejor experiencia
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onCancel}>
                No aún
              </Button>
              <Button onClick={onConfirm} className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                Sí, vamos
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
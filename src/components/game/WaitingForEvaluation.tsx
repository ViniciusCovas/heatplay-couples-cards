import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, User, MessageSquare } from "lucide-react";
import { type ResponseEvaluation as ResponseEvaluationType } from "@/components/game/ResponseEvaluation";

interface WaitingForEvaluationProps {
  isVisible: boolean;
  question: string;
  response: string;
  responseTime: number;
  onEvaluate: (evaluation: ResponseEvaluationType) => void;
  isMyTurn: boolean; // true si es mi turno para evaluar
  partnerName: string;
}

export const WaitingForEvaluation = ({ 
  isVisible, 
  question,
  response,
  responseTime,
  onEvaluate,
  isMyTurn,
  partnerName
}: WaitingForEvaluationProps) => {
  
  if (!isVisible) return null;

  if (!isMyTurn) {
    // Esperando que el otro jugador evalúe
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Timer className="w-8 h-8 text-white animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Esperando evaluación...
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {partnerName} está evaluando tu respuesta
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Tu respuesta:</p>
              <p className="font-medium">{response}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Tiempo: {Math.round(responseTime)}s
              </p>
            </div>
          </div>

          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </Card>
      </div>
    );
  }

  // Es mi turno para evaluar la respuesta del otro jugador
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <User className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h2 className="text-xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Evalúa la respuesta
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {partnerName} respondió a la pregunta
            </p>
          </div>
        </div>

        {/* Pregunta */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground mb-2">Pregunta:</p>
          <p className="font-medium">{question}</p>
        </div>

        {/* Respuesta */}
        <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">Respuesta de {partnerName}:</p>
          </div>
          <p className="font-medium text-lg">{response}</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            Tiempo: {Math.round(responseTime)}s
          </p>
        </div>

        {/* Botones de evaluación */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">¿Cómo calificas esta respuesta?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => onEvaluate({ honesty: 5, attraction: 5, intimacy: 5, surprise: 5 })}
              className="h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              💚 Excelente
            </Button>
            <Button 
              onClick={() => onEvaluate({ honesty: 4, attraction: 4, intimacy: 4, surprise: 4 })}
              className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              💙 Buena
            </Button>
            <Button 
              onClick={() => onEvaluate({ honesty: 3, attraction: 3, intimacy: 3, surprise: 3 })}
              className="h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
            >
              💛 Regular
            </Button>
            <Button 
              onClick={() => onEvaluate({ honesty: 2, attraction: 2, intimacy: 2, surprise: 2 })}
              className="h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              ❤️ Mejorable
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
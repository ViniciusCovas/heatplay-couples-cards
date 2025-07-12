import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, Flame, Zap, Clock, Gamepad2, Target } from "lucide-react";

interface ResponseEvaluationProps {
  isVisible: boolean;
  question: string;
  response: string;
  responseTime: number;
  onEvaluate: (evaluation: ResponseEvaluation) => void;
  partnerName?: string;
}

export interface ResponseEvaluation {
  honesty: number; // 1-5 (conexión emocional)
  attraction: number; // 1-5 (atracción sentida)
  intimacy: number; // 1-5 (nivel de intimidad)
  surprise: number; // 1-5 (factor sorpresa/curiosidad)
}

export const ResponseEvaluation = ({ 
  isVisible, 
  question, 
  response, 
  responseTime, 
  onEvaluate,
  partnerName = "tu pareja"
}: ResponseEvaluationProps) => {
  const [evaluation, setEvaluation] = useState<ResponseEvaluation>({
    honesty: 0,
    attraction: 0,
    intimacy: 0,
    surprise: 0
  });

  if (!isVisible) return null;

  const handleEvaluationChange = (category: keyof ResponseEvaluation, value: number) => {
    setEvaluation(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = () => {
    onEvaluate(evaluation);
  };

  const isComplete = Object.values(evaluation).every(v => v > 0);

  const renderStarRating = (category: keyof ResponseEvaluation, icon: React.ReactNode, label: string) => (
    <div className="space-y-2 p-3 bg-gradient-to-r from-background/50 to-muted/30 rounded-lg border border-primary/10">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs sm:text-sm font-medium">{label}</span>
      </div>
      <div className="flex gap-1 sm:gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleEvaluationChange(category, rating)}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              evaluation[category] >= rating
                ? 'bg-gradient-to-br from-primary to-secondary border-primary text-white shadow-lg shadow-primary/30'
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <Star 
              className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" 
              fill={evaluation[category] >= rating ? "currentColor" : "none"} 
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 backdrop-blur-xl z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Scrollable container para móviles - FIXED */}
      <div className="w-full max-w-lg min-h-full flex items-center justify-center py-4">
        <Card className="w-full p-4 sm:p-6 space-y-4 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10 my-auto">
          {/* Gaming Header - más compacto */}
          <div className="text-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-accent rounded-full animate-pulse border-2 border-background flex items-center justify-center">
                <Clock className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
              </div>
            </div>
            
            <div>
              <h2 className="text-lg sm:text-xl font-heading bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Evaluación Secreta 🎯
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                <span className="font-mono text-accent">Respondió en {Math.round(responseTime)}s</span>
              </div>
            </div>
          </div>

          {/* Content Cards - más compactas */}
          <div className="space-y-3">
            <div className="relative p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
              <div className="absolute top-2 left-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Pregunta:</p>
              <p className="text-sm font-medium leading-tight">{question}</p>
            </div>
            
            <div className="relative p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-500/10">
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Respuesta de {partnerName}:</p>
              <p className="text-sm font-medium leading-tight">{response}</p>
            </div>
          </div>

          {/* Rating Section - más compacta */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Target className="w-3 h-3" />
                Evalúa secretamente esta respuesta
              </p>
            </div>
            
            <div className="space-y-3">
              {renderStarRating('honesty', <Heart className="w-3 h-3 text-red-500" />, 'Honestidad')}
              {renderStarRating('attraction', <Flame className="w-3 h-3 text-orange-500" />, 'Atracción')}
              {renderStarRating('intimacy', <Zap className="w-3 h-3 text-purple-500" />, 'Intimidad')}
              {renderStarRating('surprise', <Star className="w-3 h-3 text-yellow-500" />, 'Sorpresa')}
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full h-10 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all text-white text-sm sm:text-base"
            disabled={!isComplete}
            size="lg"
          >
            <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Confirmar Evaluación
          </Button>
          
          {/* Debug info for mobile */}
          <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
            <p>Response: {response?.substring(0, 20)}...</p>
            <p>Time: {responseTime}s</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
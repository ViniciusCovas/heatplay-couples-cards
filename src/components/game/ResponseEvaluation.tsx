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
    <div className="space-y-3 p-4 bg-gradient-to-r from-background/50 to-muted/30 rounded-lg border border-primary/10">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleEvaluationChange(category, rating)}
            className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              evaluation[category] >= rating
                ? 'bg-gradient-to-br from-primary to-secondary border-primary text-white shadow-lg shadow-primary/30'
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <Star 
              className="w-5 h-5 mx-auto" 
              fill={evaluation[category] >= rating ? "currentColor" : "none"} 
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Gaming Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full animate-pulse border-2 border-background flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-heading bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Evaluación Secreta 🎯
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="font-mono text-accent">Respondió en {Math.round(responseTime)}s</span>
            </div>
          </div>
        </div>

        {/* Content Cards */}
        <div className="space-y-4">
          <div className="relative p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
            <div className="absolute top-2 left-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Pregunta:</p>
            <p className="font-medium">{question}</p>
          </div>
          
          <div className="relative p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl border border-purple-500/10">
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Respuesta de {partnerName}:</p>
            <p className="font-medium">{response}</p>
          </div>
        </div>

        {/* Rating Section */}
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Target className="w-4 h-4" />
              Evalúa secretamente esta respuesta
            </p>
          </div>
          
          <div className="space-y-4">
            {renderStarRating('honesty', <Heart className="w-4 h-4 text-red-500" />, 'Honestidad')}
            {renderStarRating('attraction', <Flame className="w-4 h-4 text-orange-500" />, 'Atracción')}
            {renderStarRating('intimacy', <Zap className="w-4 h-4 text-purple-500" />, 'Intimidad')}
            {renderStarRating('surprise', <Star className="w-4 h-4 text-yellow-500" />, 'Sorpresa')}
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all text-white"
          disabled={!isComplete}
          size="lg"
        >
          <Target className="w-5 h-5 mr-2" />
          Confirmar Evaluación
        </Button>
      </Card>
    </div>
  );
};
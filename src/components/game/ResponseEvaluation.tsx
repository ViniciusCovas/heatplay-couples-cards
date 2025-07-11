import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, Flame, Zap, Clock } from "lucide-react";

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleEvaluationChange(category, rating)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              evaluation[category] >= rating
                ? 'bg-primary border-primary text-white'
                : 'border-muted-foreground/30 hover:border-primary/50'
            }`}
          >
            <Star className="w-4 h-4 mx-auto" fill={evaluation[category] >= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-heading">Evaluación Secreta</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Respondió en {Math.round(responseTime)}s</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pregunta:</p>
            <p className="font-medium">{question}</p>
          </div>
          
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Respuesta de {partnerName}:</p>
            <p className="font-medium">{response}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Evalúa secretamente esta respuesta:
          </p>
          
          {renderStarRating('honesty', <Heart className="w-4 h-4 text-red-500" />, 'Honestidad')}
          {renderStarRating('attraction', <Flame className="w-4 h-4 text-orange-500" />, 'Atracción')}
          {renderStarRating('intimacy', <Zap className="w-4 h-4 text-purple-500" />, 'Intimidad')}
          {renderStarRating('surprise', <Star className="w-4 h-4 text-yellow-500" />, 'Sorpresa')}
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={!isComplete}
        >
          Confirmar Evaluación
        </Button>
      </Card>
    </div>
  );
};
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Flame, Zap, Star, Eye, TrendingUp, Home, RotateCcw } from "lucide-react";

export interface ConnectionData {
  emotionalConnection: number; // 0-5
  attraction: number; // 0-5
  intimacy: number; // 0-5
  mutualCuriosity: number; // 0-5
  emotionalSync: number; // 0-100 percentage
  overallScore: number; // 0-5
  feeling: string;
  totalResponses: number;
  averageResponseTime: number;
}

interface ConnectionReportProps {
  isVisible: boolean;
  connectionData: ConnectionData;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const ConnectionReport = ({
  isVisible,
  connectionData,
  onPlayAgain,
  onGoHome
}: ConnectionReportProps) => {
  if (!isVisible) return null;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-yellow-600";
    if (score >= 2.5) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 4.5) return "🔥";
    if (score >= 3.5) return "💫";
    if (score >= 2.5) return "✨";
    return "💭";
  };

  const renderScoreRow = (
    label: string,
    score: number,
    icon: React.ReactNode,
    maxScore: number = 5
  ) => (
    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 flex-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20">
          <Progress value={(score / maxScore) * 100} className="h-2" />
        </div>
        <span className={`font-bold text-lg ${getScoreColor(score)}`}>
          {maxScore === 100 ? `${Math.round(score)}%` : `${score.toFixed(1)}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 space-y-6 animate-scale-in my-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">{getScoreEmoji(connectionData.overallScore)}</div>
          <div>
            <h2 className="text-2xl font-heading mb-2">Reporte de Conexión Íntima</h2>
            <p className="text-lg font-semibold text-primary">{connectionData.feeling}</p>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="text-3xl font-bold text-primary mb-1">
              {connectionData.overallScore.toFixed(1)}/5.0
            </div>
            <p className="text-sm text-muted-foreground">Índice de Conexión Íntima</p>
          </div>
        </div>

        <div className="space-y-3">
          {renderScoreRow(
            "Conexión emocional",
            connectionData.emotionalConnection,
            <Heart className="w-5 h-5 text-red-500" />
          )}
          
          {renderScoreRow(
            "Atracción sentida",
            connectionData.attraction,
            <Flame className="w-5 h-5 text-orange-500" />
          )}
          
          {renderScoreRow(
            "Intimidad",
            connectionData.intimacy,
            <Zap className="w-5 h-5 text-purple-500" />
          )}
          
          {renderScoreRow(
            "Curiosidad mutua",
            connectionData.mutualCuriosity,
            <Star className="w-5 h-5 text-yellow-500" />
          )}
          
          {renderScoreRow(
            "Sintonía emocional",
            connectionData.emotionalSync,
            <Eye className="w-5 h-5 text-blue-500" />,
            100
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{connectionData.totalResponses}</div>
            <div className="text-xs text-muted-foreground">Respuestas totales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(connectionData.averageResponseTime)}s</div>
            <div className="text-xs text-muted-foreground">Tiempo promedio</div>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={onPlayAgain} className="w-full flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Jugar Otro Nivel
          </Button>
          
          <Button onClick={onGoHome} variant="outline" className="w-full flex items-center gap-2">
            <Home className="w-4 h-4" />
            Volver al Inicio
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            💜 El amor verdadero se construye con comunicación y respeto
          </p>
        </div>
      </Card>
    </div>
  );
};
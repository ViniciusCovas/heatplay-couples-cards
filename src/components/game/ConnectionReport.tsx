import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/animated-logo";
import { Heart, Flame, Zap, Star, Eye, Home, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GetCloseAnalysis } from "./GetCloseAnalysis";
import { useSearchParams } from "react-router-dom";
import { logger } from "@/utils/logger";

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
  roomId?: string;
  language?: string;
}

export const ConnectionReport = ({
  isVisible,
  connectionData,
  onPlayAgain,
  onGoHome,
  roomId,
  language = 'en'
}: ConnectionReportProps) => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  
  // Get room ID from search params if not provided
  const currentRoomId = roomId || searchParams.get('room');
  
  // Debug language consistency
  logger.debug('ConnectionReport language', { language: i18n.language });
  
  if (!isVisible) return null;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-success";
    if (score >= 3.5) return "text-warning";
    if (score >= 2.5) return "text-accent";
    return "text-destructive";
  };

  const renderScoreRow = (
    label: string,
    score: number,
    icon: React.ReactNode,
    maxScore: number = 5
  ) => (
    <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/40 rounded-lg border border-primary/10">
      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
        <div className="shrink-0">{icon}</div>
        <span className="font-medium text-sm sm:text-base truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="w-12 sm:w-20">
          <Progress value={(score / maxScore) * 100} className="h-1.5 sm:h-2" />
        </div>
        <span className={`font-bold text-sm sm:text-lg ${getScoreColor(score)}`}>
          {maxScore === 100 ? `${Math.round(score)}%` : `${score.toFixed(1)}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-sm sm:max-w-lg p-4 sm:p-6 space-y-4 sm:space-y-6 animate-scale-in my-2 sm:my-4 max-h-[98vh] overflow-y-auto bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        <div className="text-center space-y-3 sm:space-y-4">
          <Logo size="small" className="mx-auto" />
          
          <div className="flex justify-center my-4 sm:my-6">
            <Logo size="medium" className="mx-auto" />
          </div>
          
          <div>
            <h2 className="text-lg sm:text-2xl font-heading mb-1 sm:mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {t('connectionReport.title')}
            </h2>
            <p className="text-base sm:text-lg font-semibold text-primary">{t(connectionData.feeling)}</p>
          </div>
          
          <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
              {connectionData.overallScore.toFixed(1)}/5.0
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('connectionReport.overallScore')}</p>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {renderScoreRow(
            t('connectionReport.labels.emotionalConnection'),
            connectionData.emotionalConnection,
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          )}
          
          {renderScoreRow(
            t('connectionReport.labels.attraction'),
            connectionData.attraction,
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          )}
          
          {renderScoreRow(
            t('connectionReport.labels.intimacy'),
            connectionData.intimacy,
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          )}
          
          {renderScoreRow(
            t('connectionReport.labels.mutualCuriosity'),
            connectionData.mutualCuriosity,
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          )}
          
          {renderScoreRow(
            t('connectionReport.labels.emotionalSync'),
            connectionData.emotionalSync,
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
            100
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-lg border border-muted/30">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-primary">{connectionData.totalResponses}</div>
            <div className="text-xs text-muted-foreground">{t('connectionReport.stats.totalResponses')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-primary">{Math.round(connectionData.averageResponseTime)}s</div>
            <div className="text-xs text-muted-foreground">{t('connectionReport.stats.averageTime')}</div>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <Button onClick={onPlayAgain} className="w-full flex items-center justify-center gap-2 h-11 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-300">
            <RotateCcw className="w-4 h-4" />
            {t('connectionReport.buttons.newGame')}
          </Button>
          
          <Button onClick={onGoHome} variant="outline" className="w-full flex items-center justify-center gap-2 h-11 sm:h-12 text-sm sm:text-base border-primary/30 hover:bg-primary/5 transition-all duration-300">
            <Home className="w-4 h-4" />
            {t('connectionReport.buttons.backHome')}
          </Button>
        </div>

        {/* GetClose AI Analysis Section */}
        {currentRoomId && (
          <div className="mt-4">
            <GetCloseAnalysis
              roomId={currentRoomId}
              language={language || i18n.language}
              isVisible={true}
            />
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t('connectionReport.footer')}
          </p>
        </div>
      </Card>
    </div>
  );
};

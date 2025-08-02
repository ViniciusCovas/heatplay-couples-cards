import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, Heart, Flame, Zap, Users, AlertTriangle, Gamepad2, Trophy } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { logger } from "@/utils/logger";

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
    nameKey: "levels.level2Name",
    icon: <Flame className="w-6 h-6" />,
    color: "orange",
    descriptionKey: "levelUp.level2Description"
  },
  3: {
    nameKey: "levels.level3Name", 
    icon: <Zap className="w-6 h-6" />,
    color: "red",
    descriptionKey: "levelUp.level3Description"
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
  const { t, i18n } = useTranslation();
  
  // Debug language consistency
  logger.debug('LevelUpConfirmation language', { language: i18n.language });
  
  if (!isVisible) return null;

  const nextLevel = currentLevel + 1;
  const levelInfo = LEVEL_INFO[nextLevel as keyof typeof LEVEL_INFO];
  
  if (!levelInfo) return null;

  const isUnderRecommended = cardsCompleted < minimumRecommended;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-500/10 via-background to-red-500/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {waitingForPartner ? (
          <div className="text-center space-y-6">
            {/* Gaming Waiting Animation */}
            <div className="relative">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-pulse">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin border-t-primary"></div>
            </div>
            
            <div>
              <h2 className="text-xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                {t('levelUp.waitingForPartner')}
              </h2>
              <p className="text-muted-foreground">
                {t('levelUp.partnerMustConfirm')}
              </p>
            </div>
            
            {/* Gaming Loading Dots */}
            <div className="flex gap-2 justify-center">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onCancel} 
              className="w-full border-primary/30 hover:border-primary/50"
            >
              {t('buttons.cancel')}
            </Button>
          </div>
        ) : (
          <>
            {/* Gaming Header */}
            <div className="text-center space-y-4">
              <div className="relative">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 ${
                  levelInfo.color === 'orange' 
                    ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
                    : 'bg-gradient-to-br from-red-500 to-pink-500'
                }`}>
                  {levelInfo.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center border-2 border-background animate-bounce">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-heading bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                  {t('levelUp.title')}
                </h2>
                <p className="text-muted-foreground">
                  {t('levelUp.subtitle', { level: nextLevel, name: t(levelInfo.nameKey) })}
                </p>
              </div>
            </div>

            {/* Level Info Card */}
            <div className="space-y-4">
              <div className={`relative p-6 rounded-xl border ${
                levelInfo.color === 'orange'
                  ? 'bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20'
                  : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20'
              }`}>
                <div className="absolute top-2 left-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    levelInfo.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                  }`}></div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  {t('levelUp.nextLevel')}:
                </p>
                <p className="font-medium text-lg">{t(levelInfo.descriptionKey)}</p>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-background/50 to-muted/30 rounded-lg border border-primary/10 text-center">
                  <div className="text-2xl font-mono font-bold text-primary">{cardsCompleted}</div>
                  <div className="text-xs text-muted-foreground">{t('levelUp.completed')}</div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-background/50 to-muted/30 rounded-lg border border-secondary/10 text-center">
                  <div className="text-2xl font-mono font-bold text-secondary">{minimumRecommended}</div>
                  <div className="text-xs text-muted-foreground">{t('levelUp.recommended')}</div>
                </div>
              </div>

              {/* Warning */}
              {isUnderRecommended && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">{t('levelUp.warning.title')}</p>
                    <p className="text-xs text-yellow-700">
                      {t('levelUp.warning.description', { minimum: minimumRecommended })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Gaming Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="h-12 border-primary/30 hover:border-primary/50"
              >
                {t('levelUp.notYet')}
              </Button>
              <Button 
                onClick={onConfirm} 
                className="h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                {t('levelUp.letsGo')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
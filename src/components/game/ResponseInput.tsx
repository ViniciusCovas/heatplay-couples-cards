import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Timer, Send, Mic, Play, Gamepad2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface ResponseInputProps {
  isVisible: boolean;
  question: string;
  onSubmitResponse: (response: string, responseTime: number) => void;
  playerName?: string;
  isCloseProximity?: boolean;
  isSubmitting?: boolean;
  startTime?: number; // Optional: when card display started (for accurate timing)
}

export const ResponseInput = ({ 
  isVisible, 
  question, 
  onSubmitResponse,
  playerName = "Tú",
  isCloseProximity = false,
  isSubmitting = false,
  startTime = 0
}: ResponseInputProps) => {
  const { t } = useTranslation();
  const [response, setResponse] = useState("");
  const [localStartTime, setLocalStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    if (isVisible) {
      // Use provided start time if available, otherwise start now
      const actualStartTime = startTime > 0 ? startTime : Date.now();
      setLocalStartTime(actualStartTime);
      setCurrentTime(Date.now());
      setResponse("");
      
      // FIXED: Timer stops when submission starts (isSubmitting = true)
      const interval = setInterval(() => {
        if (!isSubmitting) {
          setCurrentTime(Date.now());
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isVisible, startTime, isSubmitting]);

  if (!isVisible) return null;

  const elapsedTime = (currentTime - localStartTime) / 1000;

  const handleSubmit = () => {
    if (response.trim()) {
      // FIXED: Calculate precise response time at moment of submission
      const finalResponseTime = (Date.now() - localStartTime) / 1000;
      onSubmitResponse(response.trim(), finalResponseTime);
      setResponse("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleSpokenResponse = () => {
    // FIXED: Calculate precise response time for spoken mode too
    const finalResponseTime = (Date.now() - localStartTime) / 1000;
    onSubmitResponse(t('game.spokenResponse'), finalResponseTime);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Gaming Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full animate-pulse border-2 border-background flex items-center justify-center">
              <Timer className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('game.yourTurnMessage', { playerName })} 🎮
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
              <Timer className="w-4 h-4 text-accent" />
              <span className="font-mono text-accent">{Math.round(elapsedTime)}s</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="relative p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
          <div className="absolute top-2 left-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <Play className="w-4 h-4" />
            {t('game.question')}:
          </p>
          <p className="font-medium text-lg leading-relaxed">{question}</p>
        </div>
        
        {isCloseProximity ? (
          /* Modo hablado */
          <div className="space-y-4 text-center">
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20">
              <Mic className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <h3 className="font-heading text-lg mb-2">{t('game.spokenMode')} 🎙️</h3>
              <p className="text-sm text-muted-foreground">
                {t('game.spokenModeDescription')}
              </p>
            </div>
            
            <Button 
              onClick={handleSpokenResponse}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all"
              size="lg"
              disabled={isSubmitting} // Añade esta línea
            >
              {isSubmitting ? (
                <>
                  <Timer className="w-5 h-5 mr-2 animate-spin" />
                  {t('game.submitting')}...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  {t('game.weResponded')}
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Modo escrito */
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">{t('game.yourResponse')}:</label>
              </div>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t('game.responsePlaceholder')}
                className="min-h-[120px] resize-none border-primary/20 focus:border-primary/40 bg-gradient-to-r from-background to-muted/30"
                autoFocus
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Send className="w-3 h-3" />
                {t('game.submitShortcut')}
              </p>
            </div>

            <Button 
              onClick={handleSubmit}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all"
              disabled={!response.trim() || isSubmitting} // Modifica esta línea
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Timer className="w-5 h-5 mr-2 animate-spin" />
                  {t('game.submitting')}...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {t('game.submitResponse')}
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
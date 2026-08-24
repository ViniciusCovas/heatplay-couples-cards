import { useState, useEffect, useId } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Timer, Send, Mic, Heart } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface ResponseInputProps {
  isVisible: boolean;
  question: string;
  onSubmitResponse: (response: string, responseTime: number) => void;
  playerName?: string;
  isCloseProximity?: boolean;
  isSubmitting?: boolean;
  startTime?: number; // Optional: when card display started (for accurate timing)
  pausedTime?: number;
  isPaused?: boolean;
  onClose?: () => void;
}

export const ResponseInput = ({
  isVisible,
  question,
  onSubmitResponse,
  playerName = "Tú",
  isCloseProximity = false,
  isSubmitting = false,
  startTime = 0,
  pausedTime = 0,
  isPaused = false,
  onClose
}: ResponseInputProps) => {
  const { t } = useTranslation();
  const [response, setResponse] = useState("");
  const [localStartTime, setLocalStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const responseFieldId = useId();

  useEffect(() => {
    if (isVisible) {
      // Use provided start time if available, otherwise start now
      const actualStartTime = startTime > 0 ? startTime : Date.now();
      setLocalStartTime(actualStartTime);
      setCurrentTime(Date.now());
      setResponse("");

      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const elapsedTime = (currentTime - localStartTime) / 1000;

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmitResponse(response.trim(), elapsedTime);
      setResponse("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleSpokenResponse = () => {
    // Para modo hablado, enviamos respuesta sin texto
    onSubmitResponse(t('game.spokenResponse'), elapsedTime);
  };

  return (
    <Dialog
      open={isVisible}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogPortal>
        {/* Light overlay so the question card stays visible above the sheet */}
        <DialogOverlay className="bg-foreground/10 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82vh] w-full max-w-md flex-col rounded-t-[28px] border border-primary/15 border-b-0 bg-card p-0 shadow-[0_-8px_40px_-12px_rgba(196,60,110,.35)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        >
          {/* Grab handle */}
          <div className="flex justify-center pt-3" aria-hidden="true">
            <div className="h-1.5 w-10 rounded-full bg-muted" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 pt-3 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full btn-gradient-primary">
                <Heart className="h-5 w-5 text-white" fill="currentColor" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-heading text-foreground">
                  {t('game.yourTurnMessage', { playerName })}
                </DialogTitle>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-primary">{Math.round(elapsedTime)}s</span>
                </div>
              </div>
            </div>

            {/* Compact question reminder (full card remains visible behind the sheet) */}
            <DialogDescription className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/80">
              {question}
            </DialogDescription>

            {isCloseProximity ? (
              /* Modo hablado */
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 to-primary/10 p-6">
                  <Mic className="mx-auto mb-3 h-10 w-10 text-accent" />
                  <h3 className="mb-2 font-heading text-lg text-foreground">{t('game.spokenMode')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('game.spokenModeDescription')}
                  </p>
                </div>
              </div>
            ) : (
              /* Modo escrito */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <label htmlFor={responseFieldId} className="text-sm font-medium">
                    {t('game.yourResponse')}
                  </label>
                </div>
                <Textarea
                  id={responseFieldId}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('game.responsePlaceholder')}
                  className="min-h-[110px] resize-none border-primary/20 bg-background focus:border-primary/40"
                  autoFocus
                />
                {/* Keyboard hint only on devices with a fine pointer */}
                <p className="hidden items-center gap-1 text-xs text-muted-foreground [@media(pointer:fine)]:flex">
                  <Send className="h-3 w-3" />
                  {t('game.submitShortcut')}
                </p>
              </div>
            )}
          </div>

          {/* Sticky action footer — always in reach */}
          <div className="sticky bottom-0 border-t border-border/60 bg-card/95 px-6 pb-6 pt-4 backdrop-blur">
            {isCloseProximity ? (
              <Button
                onClick={handleSpokenResponse}
                className="h-12 w-full btn-gradient-primary text-white disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Timer className="mr-2 h-5 w-5 animate-spin" />
                    {t('game.submitting')}
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    {t('game.weResponded')}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="h-12 w-full btn-gradient-primary text-white disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                disabled={!response.trim() || isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Timer className="mr-2 h-5 w-5 animate-spin" />
                    {t('game.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    {t('game.submitResponse')}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

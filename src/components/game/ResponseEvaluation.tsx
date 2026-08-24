import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ShieldCheck, Flame, Heart, Sparkles } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { logger } from "@/utils/logger";

interface ResponseEvaluationProps {
  isVisible: boolean;
  question: string;
  response: string;
  playerName: string;
  onSubmitEvaluation: (evaluation: EvaluationData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface EvaluationData {
  honesty: number;
  attraction: number;
  intimacy: number;
  surprise: number;
  response_time?: number;
  /**
   * Optional short impression the LISTENER writes about what their partner
   * said out loud. Answers are spoken in person and never recorded, so this
   * is the only real language the end-of-session analysis ever sees.
   * Always optional — submitting without it must behave exactly as before.
   */
  note?: string;
}

type RatingKey = 'honesty' | 'attraction' | 'intimacy' | 'surprise';

const RATINGS = [1, 2, 3, 4, 5];
const NOTE_MAX_LENGTH = 140;

export const ResponseEvaluation = ({
  isVisible,
  question,
  response,
  playerName,
  onSubmitEvaluation,
  onCancel,
  isSubmitting = false
}: ResponseEvaluationProps) => {
  const { t, i18n } = useTranslation();
  const [evaluation, setEvaluation] = useState<EvaluationData>({
    honesty: 3,
    attraction: 3,
    intimacy: 3,
    surprise: 3
  });

  const [note, setNote] = useState('');
  const trimmedNote = note.trim();

  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double submission
    // The note is strictly optional: when it is empty the payload is byte-for-byte
    // what it was before this field existed (no `note` key at all).
    const payload: EvaluationData = trimmedNote
      ? { ...evaluation, note: trimmedNote.slice(0, NOTE_MAX_LENGTH) }
      : evaluation;
    logger.debug('ResponseEvaluation: Submitting evaluation', {
      evaluation,
      hasNote: Boolean(trimmedNote),
      playerName,
      isSubmitting,
      questionPreview: question.substring(0, 50)
    });
    onSubmitEvaluation(payload);
  };

  const updateEvaluation = (key: RatingKey, value: number) => {
    setEvaluation(prev => ({ ...prev, [key]: value }));
  };

  const evaluationCriteria = [
    {
      key: "honesty" as RatingKey,
      label: t('game.evaluation.honesty'),
      icon: <ShieldCheck className="w-5 h-5 text-primary" />,
      description: t('game.evaluation.honestyDescription')
    },
    {
      key: "attraction" as RatingKey,
      label: t('game.evaluation.attraction'),
      icon: <Flame className="w-5 h-5 text-secondary" />,
      description: t('game.evaluation.attractionDescription')
    },
    {
      key: "intimacy" as RatingKey,
      label: t('game.evaluation.intimacy'),
      icon: <Heart className="w-5 h-5 text-primary" fill="currentColor" />,
      description: t('game.evaluation.intimacyDescription')
    },
    {
      key: "surprise" as RatingKey,
      label: t('game.evaluation.surprise'),
      icon: <Sparkles className="w-5 h-5 text-accent" />,
      description: t('game.evaluation.surpriseDescription')
    }
  ];

  logger.debug('ResponseEvaluation language', { language: i18n.language });

  return (
    <Dialog open={isVisible} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/15 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_24px_60px_-20px_rgba(196,60,110,.4)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
            <div>
              <DialogTitle className="text-xl font-brand font-semibold text-foreground">
                {t('game.evaluation.title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('game.evaluation.subtitle', { player: playerName })}
              </DialogDescription>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={isSubmitting}
                aria-label={t('game.evaluation.close')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
              <p className="mb-1 text-sm font-medium text-foreground">
                {t('game.evaluation.question')}
              </p>
              <p className="mb-3 text-sm text-muted-foreground">"{question}"</p>
              <p className="mb-1 text-sm font-medium text-foreground">
                {t('game.evaluation.response')}
              </p>
              <p className="text-sm font-medium italic text-primary">"{response}"</p>
            </div>

            <div className="space-y-5">
              {evaluationCriteria.map((criterion) => (
                <div key={criterion.key} className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{criterion.icon}</div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground font-brand">
                        {criterion.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{criterion.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2" role="group" aria-label={criterion.label}>
                    {RATINGS.map((value) => {
                      const selected = (evaluation[criterion.key] || 3) === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateEvaluation(criterion.key, value)}
                          aria-pressed={selected}
                          aria-label={t('game.evaluation.rateAria', {
                            criterion: criterion.label,
                            value,
                          })}
                          className={`h-11 min-h-[44px] rounded-xl border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            selected
                              ? 'border-transparent btn-gradient-primary text-white shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional note from the listener about what their partner said out
                loud. Never required — no validation, no nag when left empty. */}
            <div className="space-y-1.5 border-t border-border/60 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor="evaluation-note"
                  className="text-sm font-medium text-foreground font-brand"
                >
                  {t('game.evaluation.noteLabel')}
                </label>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
                  {t('game.evaluation.noteOptional')}
                </span>
              </div>
              <Textarea
                id="evaluation-note"
                rows={2}
                value={note}
                maxLength={NOTE_MAX_LENGTH}
                disabled={isSubmitting}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                placeholder={t('game.evaluation.notePlaceholder')}
                aria-describedby="evaluation-note-hint evaluation-note-count"
                className="min-h-0 resize-none rounded-xl bg-background text-sm leading-relaxed"
              />
              <div className="flex items-start justify-between gap-3">
                <p id="evaluation-note-hint" className="text-xs text-muted-foreground">
                  {t('game.evaluation.noteHint')}
                </p>
                <span
                  id="evaluation-note-count"
                  aria-live="polite"
                  className="shrink-0 text-xs tabular-nums text-muted-foreground/70"
                >
                  {note.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky footer — submit is always visible */}
          <div className="sticky bottom-0 border-t border-border/60 bg-card/95 px-6 pb-5 pt-4 backdrop-blur">
            <Button
              onClick={handleSubmit}
              className="h-12 w-full btn-gradient-primary text-white font-brand font-semibold disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.submitting') : t('game.evaluation.submit')}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t('game.evaluation.note')}
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

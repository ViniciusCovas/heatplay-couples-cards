import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Logo } from "@/components/ui/animated-logo";
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
}

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
  const [isClosing, setIsClosing] = useState(false);

  if (!isVisible && !isClosing) return null;

  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double submission
    logger.debug('ResponseEvaluation: Submitting evaluation', {
      evaluation,
      playerName,
      isSubmitting,
      questionPreview: question.substring(0, 50)
    });
    onSubmitEvaluation(evaluation);
  };

  const handleCancel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  const updateEvaluation = (key: keyof EvaluationData, value: number) => {
    setEvaluation(prev => ({ ...prev, [key]: value }));
  };

  const getSliderColor = (value: number) => {
    if (value >= 4) return "bg-green-500";
    if (value >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const evaluationCriteria = [
    {
      key: "honesty" as keyof EvaluationData,
      label: t('game.evaluation.honesty'),
      icon: <Logo size="small" className="w-5 h-5 opacity-80" />,
      description: t('game.evaluation.honestyDescription')
    },
    {
      key: "attraction" as keyof EvaluationData,
      label: t('game.evaluation.attraction'),
      icon: <Logo size="small" className="w-5 h-5 opacity-80" />,
      description: t('game.evaluation.attractionDescription')
    },
    {
      key: "intimacy" as keyof EvaluationData,
      label: t('game.evaluation.intimacy'),
      icon: <Logo size="small" className="w-5 h-5 opacity-80" />,
      description: t('game.evaluation.intimacyDescription')
    },
    {
      key: "surprise" as keyof EvaluationData,
      label: t('game.evaluation.surprise'),
      icon: <Logo size="small" className="w-5 h-5 opacity-80" />,
      description: t('game.evaluation.surpriseDescription')
    }
  ];

  logger.debug('ResponseEvaluation language', { language: i18n.language });
  
  return (
    <div className={`fixed inset-0 romantic-background backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <Card className={`w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto romantic-card transition-transform duration-200 ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-brand font-semibold text-foreground">
              {t('game.evaluation.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('game.evaluation.subtitle', { player: playerName })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-2">
              {t('game.evaluation.question')}:
            </p>
            <p className="text-sm text-muted-foreground mb-3">"{question}"</p>
            <p className="text-sm font-medium text-foreground mb-2">
              {t('game.evaluation.response')}:
            </p>
            <p className="text-sm text-primary italic font-medium">"{response}"</p>
          </div>

          <div className="space-y-6">
            {evaluationCriteria.map((criterion) => (
              <div key={criterion.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {criterion.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground font-brand">
                        {criterion.label}
                      </span>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        {evaluation[criterion.key]}/5
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {criterion.description}
                    </p>
                  </div>
                </div>
                
                <Slider
                  value={[evaluation[criterion.key] || 3]}
                  onValueChange={(value) => updateEvaluation(criterion.key, value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full btn-gradient-primary text-white font-brand font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('common.submitting') : t('game.evaluation.submit')}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t('game.evaluation.note')}
          </p>
        </div>
      </Card>
    </div>
  );
};

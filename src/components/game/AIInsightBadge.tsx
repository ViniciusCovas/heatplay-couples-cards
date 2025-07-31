
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIInsightBadgeProps {
  reasoning?: string;
  targetArea?: string;
  className?: string;
  isGenerating?: boolean;
  failureReason?: string;
}

export const AIInsightBadge: React.FC<AIInsightBadgeProps> = ({ 
  reasoning, 
  targetArea, 
  className = "",
  isGenerating = false,
  failureReason
}) => {
  const { t } = useTranslation();

  // Show loading state while generating
  if (isGenerating) {
    return (
      <Badge 
        variant="outline" 
        className={`bg-blue-500/10 text-blue-600 border-blue-200 gap-1 px-2 py-0.5 text-xs font-medium animate-pulse ${className}`}
      >
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {t('ai.analyzing')}
      </Badge>
    );
  }

  // Show failure state if AI failed
  if (failureReason && !reasoning) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-orange-500/10 text-orange-600 border-orange-200 gap-1 px-2 py-0.5 text-xs font-medium cursor-help ${className}`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {t('ai.randomFallback')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm p-3 bg-card border shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {t('ai.fallbackSelection')}
              </div>
              <p className="text-sm leading-relaxed">{failureReason}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Don't show if no AI reasoning
  if (!reasoning) return null;

  const getTargetAreaColor = (area?: string) => {
    switch (area) {
      case 'honesty': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'attraction': return 'bg-pink-500/10 text-pink-600 border-pink-200';
      case 'intimacy': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'surprise': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      default: return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    }
  };

  const getTargetAreaExplanation = (area?: string) => {
    switch (area) {
      case 'honesty': return t('ai.targetExplanation.honesty', 'GetClose AI is targeting honesty for deeper vulnerability');
      case 'attraction': return t('ai.targetExplanation.attraction', 'GetClose AI is targeting attraction for stronger connection');
      case 'intimacy': return t('ai.targetExplanation.intimacy', 'GetClose AI is targeting intimacy for emotional closeness');
      case 'surprise': return t('ai.targetExplanation.surprise', 'GetClose AI is targeting surprise for unexpected moments');
      default: return t('ai.targetExplanation.general', 'GetClose AI selected this for optimal connection');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`
              ${getTargetAreaColor(targetArea)} 
              gap-1 px-2 py-0.5 text-xs font-medium
              hover:scale-110 transition-transform cursor-pointer
              ${className}
            `}
          >
            <Brain className="w-2.5 h-2.5" />
            {t('ai.getcloseAI')}
            <Lightbulb className="w-2.5 h-2.5 opacity-70 hover:opacity-100 transition-opacity" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-sm p-3 bg-card border shadow-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Brain className="w-4 h-4 text-primary" />
              {t('ai.intelligentSelection')}
            </div>
            {targetArea && (
              <div className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded">
                {getTargetAreaExplanation(targetArea)}
              </div>
            )}
            <p className="text-sm leading-relaxed">{reasoning}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

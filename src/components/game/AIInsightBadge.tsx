
import { Sparkles, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

interface AIInsightBadgeProps {
  reasoning?: string;
  targetArea?: string;
  className?: string;
  isGenerating?: boolean;
  failureReason?: string;
  loadingMicroTip?: string;
}

export const AIInsightBadge = ({ 
  reasoning, 
  targetArea, 
  className,
  isGenerating = false,
  failureReason,
  loadingMicroTip
}: AIInsightBadgeProps) => {
  const { t } = useTranslation();

  // Show loading state during AI generation
  if (isGenerating) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
        "bg-blue-500/10 text-blue-700 border border-blue-200/50",
        className
      )}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="whitespace-nowrap truncate max-w-32">
          {loadingMicroTip || t('ai.analyzing')}
        </span>
      </div>
    );
  }

  // Show failure state if AI failed
  if (failureReason && !reasoning) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
        "bg-orange-500/10 text-orange-700 border border-orange-200/50",
        className
      )}>
        <AlertTriangle className="w-3 h-3" />
        <span className="whitespace-nowrap">
          {t('ai.randomFallback')}
        </span>
      </div>
    );
  }

  // Show AI success state with reasoning
  if (reasoning) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
        "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 border border-purple-200/50",
        "hover:from-purple-500/20 hover:to-pink-500/20 cursor-help",
        className
      )}
      title={`${t('ai.intelligentSelection')}: ${reasoning}${targetArea ? ` | ${t('ai.targetArea')}: ${targetArea}` : ''}`}
      >
        <Sparkles className="w-3 h-3" />
        <span className="whitespace-nowrap">
          {t('ai.getcloseAI')}
        </span>
        {targetArea && (
          <>
            <Zap className="w-2 h-2 opacity-70" />
            <span className="whitespace-nowrap truncate max-w-20 opacity-80">
              {targetArea}
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
};

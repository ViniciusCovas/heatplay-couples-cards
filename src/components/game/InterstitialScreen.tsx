import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MICRO_TIPS = [
  'interstitial.tips.colors',
  'interstitial.tips.ai_analysis',
  'interstitial.tips.response_timing',
  'interstitial.tips.level_progression',
  'interstitial.tips.proximity_question',
  'interstitial.tips.ai_reasoning',
  'interstitial.tips.evaluation_criteria',
  'interstitial.tips.connection_algorithm',
  'interstitial.tips.question_variety',
  'interstitial.tips.cultural_adaptation',
  'interstitial.tips.surprise_factor',
  'interstitial.tips.honest_responses',
  'interstitial.tips.attraction_scale',
  'interstitial.tips.intimacy_levels',
  'interstitial.tips.game_psychology',
  'interstitial.tips.relationship_insights',
  'interstitial.tips.ai_selection',
  'interstitial.tips.conversation_flow',
  'interstitial.tips.emotional_intelligence',
  'interstitial.tips.vulnerability_trust',
  'interstitial.tips.authentic_connection',
  'interstitial.tips.listening_skills',
  'interstitial.tips.empathy_building',
  'interstitial.tips.communication_patterns',
  'interstitial.tips.relationship_growth',
  'interstitial.tips.trust_building',
  'interstitial.tips.shared_experiences',
  'interstitial.tips.emotional_safety',
  'interstitial.tips.active_listening',
  'interstitial.tips.non_verbal_cues',
  'interstitial.tips.quality_time',
  'interstitial.tips.appreciation_gratitude',
  'interstitial.tips.conflict_resolution',
  'interstitial.tips.future_planning'
];

interface InterstitialScreenProps {
  onComplete?: () => void;
}

export const InterstitialScreen = ({ onComplete }: InterstitialScreenProps) => {
  const { t } = useTranslation();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate through tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % MICRO_TIPS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Get a random starting tip
  useEffect(() => {
    setCurrentTipIndex(Math.floor(Math.random() * MICRO_TIPS.length));
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto p-8 text-center space-y-6 bg-card/95 border border-border/50 shadow-2xl">
        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <Sparkles className="w-4 h-4 text-primary/60 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {t('interstitial.selecting')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('interstitial.please_wait')}
          </p>
        </div>

        {/* Micro Tip Section */}
        <div className="border-t border-border/30 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
              <Sparkles className="w-3 h-3" />
              <span>{t('interstitial.did_you_know')}</span>
            </div>
            <div 
              key={currentTipIndex}
              className="text-sm text-foreground/90 font-medium leading-relaxed animate-in fade-in-0 duration-500"
            >
              {t(MICRO_TIPS[currentTipIndex])}
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-1 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i === (currentTipIndex % 3) ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};
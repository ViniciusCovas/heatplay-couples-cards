import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const MICRO_TIPS = [
  'interstitial.tips.director',
  'interstitial.tips.variables',
  'interstitial.tips.questions',
  'interstitial.tips.context',
  'interstitial.tips.honest',
  'interstitial.tips.personalized',
  'interstitial.tips.calculated',
  'interstitial.tips.rhythm',
  'interstitial.tips.fingerprint',
  'interstitial.tips.language'
];

export const InterstitialScreen = () => {
  const { t } = useTranslation();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState('opacity-100');

  useEffect(() => {
    // Randomize the initial tip
    setCurrentTipIndex(Math.floor(Math.random() * MICRO_TIPS.length));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeClass('opacity-0');
      
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % MICRO_TIPS.length);
        setFadeClass('opacity-100');
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-primary/20">
        {/* AI Loading Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {t('interstitial.aiSelecting')}
          </h2>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Micro Tips */}
        <div className="min-h-[60px] flex items-center justify-center">
          <p 
            className={`text-sm text-muted-foreground transition-opacity duration-300 italic ${fadeClass}`}
          >
            "{t(MICRO_TIPS[currentTipIndex])}"
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center space-x-2 opacity-60">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse [animation-delay:0.5s]"></div>
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse [animation-delay:1s]"></div>
        </div>
      </Card>
    </div>
  );
};
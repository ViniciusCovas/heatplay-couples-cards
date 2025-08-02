import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const MICRO_TIPS = [
  "Each color has a purpose: 🟣 Intimacy, 🔵 Honesty, 🩷 Attraction, and 🟠 Surprise.",
  "Blue cards 🔵 are for building a foundation of trust. Don't hold back.",
  "Purple cards 🟣 are designed to deepen your emotional closeness.",
  "Pink cards 🩷 enhance your romantic and physical connection.",
  "Orange cards 🟠 add an element of fun and unpredictability.",
  "Pay attention to the color sequences; they tell a story.",
  "Your evaluations are the most important input you can give the game.",
  "The color you see next is a direct response to your last interaction.",
  "GetClose AI acts as a Director of Emotional Experience.",
  "Our AI measures dozens of variables to create the perfect card experience for you.",
  "From over 1,000 questions, we pick only the ones you both need right now.",
  "Your interactions establish the current conversational context for the AI.",
  "Don't fake it. Our AI is designed to read between the lines.",
  "The more honest you are, the more personalized your journey becomes.",
  "This isn't random. Every card is a calculated step forward.",
  "Our engine analyzes the emotional rhythm of your conversation.",
  "We're tracking your connection's unique fingerprint.",
  "The AI is learning your shared language.",
  "We ensure the conversation evolves coherently according to your designed emotional journey.",
  "Let's Get Close builds the narrative arc you design with your answers.",
  "We collect your shared experience to create a deeper journey.",
  "Just be yourselves. We'll be in charge of the rest.",
  "This is more than a game; it's a conversation architect.",
  "We're creating a meaningful emotional arc, one card at a time.",
  "The goal is not to win, but to connect.",
  "Vulnerability is the engine of this experience.",
  "Every answer is a brushstroke on the canvas of your relationship.",
  "This experience is designed to create 'remember when...?' moments.",
  "At the end, request your AI analysis to learn more about you both.",
  "This is a safe space to explore the conversations you haven't had yet.",
  "The strongest connections are built on the bravest conversations.",
  "Discover new sides of each other, one question at a time.",
  "What you learn here is meant to be taken with you.",
  "Connection is a skill. You're practicing it right now."
];

export const InterstitialScreen = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    // Start with a random tip
    setCurrentTipIndex(Math.floor(Math.random() * MICRO_TIPS.length));
    
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % MICRO_TIPS.length);
    }, 3000); // Change tip every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl p-8 text-center space-y-8 animate-fade-in">
        {/* Loading animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-secondary rounded-full animate-spin animate-reverse"></div>
          </div>
        </div>

        {/* AI selection message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('interstitial.aiSelecting')}
          </h2>
          <p className="text-muted-foreground">
            {t('interstitial.choosingPerfectQuestion')}
          </p>
        </div>

        {/* Micro-tip */}
        <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-primary">💡</span>
            <span className="text-sm font-medium text-primary">
              {t('interstitial.didYouKnow')}
            </span>
          </div>
          <p 
            key={currentTipIndex}
            className="text-foreground leading-relaxed animate-fade-in"
          >
            {MICRO_TIPS[currentTipIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i === (Math.floor(Date.now() / 800) % 3)
                  ? 'bg-primary scale-125'
                  : 'bg-primary/30'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};
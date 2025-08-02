import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate through micro-tips every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % MICRO_TIPS.length);
        setIsVisible(true);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Start with a random tip
  useEffect(() => {
    setCurrentTipIndex(Math.floor(Math.random() * MICRO_TIPS.length));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-8 text-center space-y-6">
          {/* Loading Animation */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto relative">
              <Brain className="w-16 h-16 text-primary animate-pulse" />
              <Sparkles className="w-6 h-6 text-accent absolute -top-1 -right-1 animate-spin" />
            </div>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {t('game.ai.selectingQuestion')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('game.ai.analyzingResponse')}
            </p>
          </div>

          {/* Micro-Tip */}
          <div 
            className={`transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ minHeight: '3rem' }}
          >
            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-primary font-medium">💡 Did you know? </span>
                {MICRO_TIPS[currentTipIndex]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Logo } from "@/components/ui/animated-logo";
import { AIInsightBadge } from "@/components/game/AIInsightBadge";
import { logger } from "@/utils/logger";
import { useMemo } from 'react';

interface GameCardProps {
  currentCard: string;
  currentLevel: number;
  showCard: boolean;
  cardIndex: number;
  totalCards: number;
  aiReasoning?: string;
  aiTargetArea?: string;
  selectionMethod?: string;
  isGeneratingCard?: boolean;
  aiFailureReason?: string;
  subTurn?: string;
  questionProgress?: {
    current: number;
    total: number;
    subPhase: string;
  };
}

export const GameCard = ({ 
  currentCard, 
  currentLevel, 
  showCard, 
  cardIndex, 
  totalCards,
  aiReasoning,
  aiTargetArea,
  selectionMethod,
  isGeneratingCard = false,
  aiFailureReason,
  subTurn,
  questionProgress
}: GameCardProps) => {
  const { t } = useTranslation();
  
  const getLevelName = (level: number) => {
    return t(`levels.level${level}Name`);
  };

  // Get a random micro-tip for loading state
  const loadingMicroTip = useMemo(() => {
    const microTips = t('ai.microTips', { returnObjects: true }) as string[];
    if (Array.isArray(microTips) && microTips.length > 0) {
      const randomIndex = Math.floor(Math.random() * microTips.length);
      return microTips[randomIndex];
    }
    return t('ai.analyzing');
  }, [t, isGeneratingCard]);

  // Check if this is an AI-selected card - Enhanced detection
  const isAICard = selectionMethod === 'ai_intelligent' || Boolean(aiReasoning);
  
  // Debug logging for AI badge display
  logger.debug('GameCard render', {
    hasCard: Boolean(currentCard),
    isAICard,
    hasReasoning: Boolean(aiReasoning),
    selectionMethod,
    targetArea: aiTargetArea,
    isGeneratingCard,
    loadingMicroTip
  });
  
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="relative perspective-1000">
        <Card 
          className={`
            w-80 h-96 p-0 transition-all duration-700 transform-gpu 
            ${showCard ? 'scale-100 opacity-100 rotate-0' : 'scale-95 opacity-70 rotate-1'}
            border-0 rounded-[32px] shadow-2xl
            relative overflow-hidden
            hover:scale-105 hover:shadow-3xl
            ${currentLevel === 1 ? 'bg-gradient-to-br from-green-300 via-green-200 to-green-100' : ''}
            ${currentLevel === 2 ? 'bg-gradient-to-br from-purple-400 via-purple-300 to-purple-200' : ''}
            ${currentLevel === 3 ? 'bg-gradient-to-br from-red-400 via-red-300 to-red-200' : ''}
            ${currentLevel === 4 ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600' : ''}
          `}
        >
          {/* Inner card area with white background */}
          <div className="absolute inset-4 bg-white rounded-[24px] shadow-inner">
            {/* Card content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-6 p-6">
              {/* Logo and Level indicator at top */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo size="small" className="scale-50 opacity-60" />
                  
                   {/* AI Badge - Show loading, success, or failure states */}
                   <AIInsightBadge 
                     reasoning={aiReasoning}
                     targetArea={aiTargetArea}
                     className="text-xs px-1.5 py-0.5 shadow-sm scale-75 origin-left"
                     isGenerating={isGeneratingCard}
                     failureReason={aiFailureReason}
                     loadingMicroTip={loadingMicroTip}
                   />
                </div>
                
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm
                  ${currentLevel === 1 ? 'bg-green-500' : ''}
                  ${currentLevel === 2 ? 'bg-purple-500' : ''}
                  ${currentLevel === 3 ? 'bg-red-500' : ''}
                  ${currentLevel === 4 ? 'bg-gray-900' : ''}
                `}>
                  {currentLevel}
                </div>
              </div>
              
              {/* Card suit icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                ${currentLevel === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' : ''}
                ${currentLevel === 2 ? 'bg-gradient-to-br from-purple-400 to-purple-600' : ''}
                ${currentLevel === 3 ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
                ${currentLevel === 4 ? 'bg-gradient-to-br from-gray-700 to-gray-900' : ''}
              `}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              
              {/* Card text or loading micro-tip */}
              {isGeneratingCard ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 font-brand font-medium leading-relaxed max-w-60 px-2">
                    {currentCard ? loadingMicroTip : "Loading questions..."}
                  </p>
                </div>
              ) : (
                <p className="text-lg text-gray-800 font-brand font-medium leading-relaxed max-w-60 px-2">
                  {currentCard}
                </p>
              )}
              
              {/* Level name at bottom */}
              <div className="absolute bottom-6 left-6 right-6 text-center space-y-2">
                <p className={`text-sm font-brand font-semibold
                  ${currentLevel === 1 ? 'text-green-600' : ''}
                  ${currentLevel === 2 ? 'text-purple-600' : ''}
                  ${currentLevel === 3 ? 'text-red-600' : ''}
                  ${currentLevel === 4 ? 'text-gray-700' : ''}
                `}>
                  {getLevelName(currentLevel)}
                </p>
                
                {/* Question progress indicator */}
                {questionProgress && (
                  <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                    <span>Q{questionProgress.current}</span>
                    <span>•</span>
                    <span>{questionProgress.subPhase}</span>
                  </div>
                )}
              </div>
              
              {/* Card number */}
              {!isGeneratingCard && (
                <div className="absolute bottom-6 right-6 text-xs font-mono text-gray-400 opacity-80">
                  {cardIndex + 1}/{totalCards}
                </div>
              )}
            </div>
          </div>
          
          {/* Decorative corners on outer border */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/50 rounded-tl-lg"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/50 rounded-tr-lg"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/50 rounded-bl-lg"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/50 rounded-br-lg"></div>
          
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-[32px] opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
        </Card>
      </div>
    </div>
  );
};


import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface GameCardProps {
  currentCard: string;
  currentLevel: number;
  showCard: boolean;
  cardIndex: number;
  totalCards: number;
}

const LEVEL_NAMES = {
  1: "Descubrimiento",
  2: "Confianza", 
  3: "Sin filtros"
};

export const GameCard = ({ currentCard, currentLevel, showCard, cardIndex, totalCards }: GameCardProps) => {
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
            ${currentLevel === 1 ? 'bg-gradient-to-br from-yellow-300 via-yellow-200 to-yellow-100' : ''}
            ${currentLevel === 2 ? 'bg-gradient-to-br from-orange-400 via-orange-300 to-orange-200' : ''}
            ${currentLevel === 3 ? 'bg-gradient-to-br from-red-400 via-red-300 to-red-200' : ''}
          `}
        >
          {/* Inner card area with white background */}
          <div className="absolute inset-4 bg-white rounded-[24px] shadow-inner">
            {/* Card content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-6 p-6">
              {/* Level indicator at top */}
              <div className="absolute top-6 left-6 flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm
                  ${currentLevel === 1 ? 'bg-yellow-500' : ''}
                  ${currentLevel === 2 ? 'bg-orange-500' : ''}
                  ${currentLevel === 3 ? 'bg-red-500' : ''}
                `}>
                  {currentLevel}
                </div>
              </div>
              
              {/* Card suit icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                ${currentLevel === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : ''}
                ${currentLevel === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : ''}
                ${currentLevel === 3 ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
              `}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              
              {/* Card text */}
              <p className="text-lg text-gray-800 font-medium leading-relaxed max-w-60 px-2">
                {currentCard}
              </p>
              
              {/* Level name at bottom */}
              <div className="absolute bottom-6 left-6 right-6 text-center">
                <p className={`text-sm font-semibold
                  ${currentLevel === 1 ? 'text-yellow-600' : ''}
                  ${currentLevel === 2 ? 'text-orange-600' : ''}
                  ${currentLevel === 3 ? 'text-red-600' : ''}
                `}>
                  {LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}
                </p>
              </div>
              
              {/* Card number */}
              <div className="absolute bottom-6 right-6 text-xs font-mono text-gray-400 opacity-80">
                {cardIndex + 1}/{totalCards}
              </div>
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
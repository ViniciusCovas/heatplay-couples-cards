import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Heart, RotateCcw, ArrowUp, Home, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample cards data - this will come from database later
const SAMPLE_CARDS = {
  1: [
    "¿Cuál fue tu primera impresión de mí?",
    "¿Qué es lo que más admiras de nuestra relación?",
    "Cuenta tu momento más vergonzoso",
    "¿Cuál es tu mayor sueño compartido?",
    "¿Qué canción te recuerda a nosotros?"
  ],
  2: [
    "¿Hay algo que siempre has querido decirme pero no te has atrevido?",
    "¿Cuál es tu mayor miedo en las relaciones?",
    "Describe el momento en que supiste que me amabas",
    "¿Qué es lo que más te excita de mí?",
    "¿Hay alguna fantasía que te gustaría compartir?"
  ],
  3: [
    "¿Cuál es tu fantasía más secreta?",
    "¿Qué es lo más atrevido que has hecho?",
    "Si pudieras cambiar algo de nuestra intimidad, ¿qué sería?",
    "¿Cuál es tu mayor turn-on?",
    "¿Hay algo nuevo que te gustaría probar juntos?"
  ]
};

const LEVEL_NAMES = {
  1: "Descubrimiento",
  2: "Confianza", 
  3: "Sin filtros"
};

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const roomCode = searchParams.get('room');
  const currentLevel = parseInt(searchParams.get('level') || '1');
  
  const [currentCard, setCurrentCard] = useState('');
  const [usedCards, setUsedCards] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [progress, setProgress] = useState(0);

  const levelCards = SAMPLE_CARDS[currentLevel as keyof typeof SAMPLE_CARDS] || [];
  const totalCards = levelCards.length;

  useEffect(() => {
    if (levelCards.length > 0) {
      const availableCards = levelCards.filter(card => !usedCards.includes(card));
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        setCurrentCard(randomCard);
      }
    }
  }, [levelCards, usedCards]);

  useEffect(() => {
    setProgress((usedCards.length / totalCards) * 100);
  }, [usedCards, totalCards]);

  const handleNextCard = () => {
    if (!usedCards.includes(currentCard)) {
      setUsedCards(prev => [...prev, currentCard]);
    }
    
    setShowCard(false);
    setTimeout(() => {
      const availableCards = levelCards.filter(card => !usedCards.includes(card) && card !== currentCard);
      
      if (availableCards.length === 0) {
        toast({
          title: "¡Nivel completado!",
          description: "Han completado todas las cartas de este nivel.",
        });
        navigate(`/level-select?room=${roomCode}`);
        return;
      }
      
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      setCurrentCard(randomCard);
      setShowCard(true);
    }, 300);
  };

  const handleSkipCard = () => {
    setShowCard(false);
    setTimeout(() => {
      const availableCards = levelCards.filter(card => !usedCards.includes(card) && card !== currentCard);
      
      if (availableCards.length === 0) {
        handleNextCard();
        return;
      }
      
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      setCurrentCard(randomCard);
      setShowCard(true);
    }, 300);
  };

  const handleLevelUp = () => {
    if (currentLevel < 3) {
      navigate(`/level-select?room=${roomCode}`);
    }
  };

  const handleEndGame = () => {
    navigate(`/?room=${roomCode}`);
  };

  useEffect(() => {
    setShowCard(true);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto space-y-6 flex-1">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/level-select?room=${roomCode}`)}
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div className="flex items-center">
              <Users className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="text-xs font-mono text-muted-foreground">{roomCode}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl font-heading text-foreground">
              Nivel {currentLevel}: {LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}
            </h1>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usedCards.length} de {totalCards} cartas completadas
              </p>
            </div>
          </div>
        </div>

        {/* Card Display */}
        <div className="flex-1 flex items-center justify-center">
          <Card 
            className={`w-full min-h-[300px] p-8 transition-all duration-500 transform ${
              showCard ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
            } bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-xl`}
          >
            <div className="h-full flex items-center justify-center">
              <p className="text-lg text-center text-foreground font-body leading-relaxed">
                {currentCard}
              </p>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleNextCard}
              className="h-12 text-base font-heading bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Heart className="w-4 h-4 mr-2" />
              Siguiente
            </Button>
            
            <Button 
              onClick={handleSkipCard}
              variant="outline"
              className="h-12 text-base font-heading border-2 border-muted"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Saltar
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleLevelUp}
              variant="secondary"
              className="h-10 text-sm"
              disabled={currentLevel >= 3}
            >
              Subir nivel
            </Button>
            
            <Button 
              onClick={handleEndGame}
              variant="destructive"
              className="h-10 text-sm"
            >
              <Home className="w-4 h-4 mr-1" />
              Terminar
            </Button>
          </div>
        </div>

        {/* Safety Note */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            💜 Recuerden comunicarse y respetar sus límites
          </p>
        </div>
      </div>
    </div>
  );
};

export default Game;
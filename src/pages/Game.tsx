import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, Home, Users, Play, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GameCard } from "@/components/game/GameCard";
import { ResponseInput } from "@/components/game/ResponseInput";
import { ResponseEvaluation, type ResponseEvaluation as ResponseEvaluationType } from "@/components/game/ResponseEvaluation";
import { WaitingForEvaluation } from "@/components/game/WaitingForEvaluation";
import { LevelUpConfirmation } from "@/components/game/LevelUpConfirmation";
import { ConnectionReport, type ConnectionData } from "@/components/game/ConnectionReport";

import { calculateConnectionScore, type GameResponse } from "@/utils/connectionAlgorithm";
import { useRoomService } from "@/hooks/useRoomService";
import { useGameSync } from "@/hooks/useGameSync";
import { usePlayerId } from "@/hooks/usePlayerId";

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

type GamePhase = 'card-display' | 'response-input' | 'evaluation' | 'level-up-confirmation' | 'final-report' | 'waiting-for-evaluation';
type PlayerTurn = 'player1' | 'player2';

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { updateRoomStatus, room, joinRoom, isConnected, getPlayerNumber } = useRoomService();
  const playerId = usePlayerId();
  const playerNumber = getPlayerNumber(); // 1 o 2
  
  // Get game sync data
  const { gameState, syncAction, updateGameState } = useGameSync(room?.id || null, playerId);
  
  const roomCode = searchParams.get('room');
  const currentLevel = parseInt(searchParams.get('level') || '1');
  
  // Auto-join room state
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  // Auto-join room if we have a roomCode but aren't connected
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    const autoJoinRoom = async () => {
      if (roomCode && !isConnected && !room && retryCount < maxRetries) {
        console.log(`🔗 Auto-joining room attempt ${retryCount + 1}:`, roomCode);
        setIsRetrying(true);
        
        try {
          const success = await joinRoom(roomCode);
          if (success) {
            console.log('✅ Successfully joined room');
            setRetryCount(0);
            setIsRetrying(false);
          } else {
            console.log(`❌ Failed to join room (attempt ${retryCount + 1})`);
            setRetryCount(prev => prev + 1);
            
            // Retry after 2 seconds
            if (retryCount + 1 < maxRetries) {
              retryTimeout = setTimeout(() => {
                setIsRetrying(false);
              }, 2000);
            } else {
              setIsRetrying(false);
              toast({
                title: "Error de conexión",
                description: `No se pudo conectar a la sala ${roomCode} después de ${maxRetries} intentos`,
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error(`❌ Auto-join error (attempt ${retryCount + 1}):`, error);
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
          
          if (retryCount + 1 >= maxRetries) {
            toast({
              title: "Error de conexión",
              description: "No se pudo conectar a la sala. Verifica el código de la sala.",
              variant: "destructive"
            });
          }
        }
      }
    };
    
    autoJoinRoom();
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomCode, isConnected, room, joinRoom, retryCount]);

  // Manual retry function
  const handleRetryConnection = () => {
    setRetryCount(0);
    setIsRetrying(true);
  };
  
  // Game state
  const [currentCard, setCurrentCard] = useState('');
  const [usedCards, setUsedCards] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('card-display');
  
  console.log('🎮 Game component render:', { 
    roomCode, 
    currentLevel, 
    gamePhase, 
    room: room?.id 
  });
  
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('player1');
  const [showCard, setShowCard] = useState(false);
  
  // Get proximity from game state
  const isCloseProximity = gameState?.proximity_response || false;
  
  // Response and evaluation data
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentResponseTime, setCurrentResponseTime] = useState(0);
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);
  const [partnerResponse, setPartnerResponse] = useState('');
  const [partnerResponseTime, setPartnerResponseTime] = useState(0);

  // Determine if it's my turn based on player number and current turn
  const isMyTurn = (currentTurn === 'player1' && playerNumber === 1) || 
                   (currentTurn === 'player2' && playerNumber === 2);
  
  // Sync with game state
  useEffect(() => {
    if (gameState) {
      setCurrentTurn(gameState.current_turn);
      if (gameState.current_card) {
        setCurrentCard(gameState.current_card);
      }
      if (gameState.used_cards) {
        setUsedCards(gameState.used_cards);
      }
      
      // Sync game phase
      if (gameState.current_phase === 'waiting-for-evaluation') {
        setGamePhase('waiting-for-evaluation');
      } else if (gameState.current_phase === 'card-display') {
        setGamePhase('card-display');
      }
    }
  }, [gameState]);
  
  // Handle sync actions from other player
  useEffect(() => {
    // This will be handled by useGameSync hook automatically
    // When the other player submits a response, it will trigger a sync action
    // and update the game state, which will then update our local state above
  }, []);
  
  // Level up confirmation
  const [showLevelUpConfirmation, setShowLevelUpConfirmation] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  
  // Final report
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  
  const levelCards = SAMPLE_CARDS[currentLevel as keyof typeof SAMPLE_CARDS] || [];
  const totalCards = levelCards.length;
  const minimumRecommended = 6;

  useEffect(() => {
    if (levelCards.length > 0) {
      const availableCards = levelCards.filter(card => !usedCards.includes(card));
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        setCurrentCard(randomCard);
        setShowCard(true);
      }
    }
  }, [levelCards, usedCards]);

  useEffect(() => {
    setProgress((usedCards.length / totalCards) * 100);
  }, [usedCards, totalCards]);

  const getNextCard = () => {
    const availableCards = levelCards.filter(card => !usedCards.includes(card));
    if (availableCards.length === 0) {
      // All cards completed for this level
      if (currentLevel >= 3) {
        generateFinalReport();
      } else {
        setShowLevelUpConfirmation(true);
      }
      return null;
    }
    return availableCards[Math.floor(Math.random() * availableCards.length)];
  };


  const handleStartResponse = () => {
    setGamePhase('response-input');
  };

  const handleResponseSubmit = async (response: string, responseTime: number) => {
    setCurrentResponse(response);
    setCurrentResponseTime(responseTime);
    
    if (isCloseProximity) {
      // MODO JUNTOS: Inmediatamente a evaluación (el mismo jugador avanza y el otro califica)
      setGamePhase('evaluation');
    } else {
      // MODO SEPARADOS: Guardar respuesta y enviar al otro jugador para que lea y califique
      try {
        // Actualizar en base de datos con la respuesta
        await updateGameState({
          current_phase: 'waiting-for-evaluation',
          current_turn: currentTurn === 'player1' ? 'player2' : 'player1'
        });
        
        // Enviar sync action
        await syncAction('response_submit', {
          response,
          responseTime,
          question: currentCard,
          from: currentTurn
        });
        
        setGamePhase('waiting-for-evaluation');
      } catch (error) {
        console.error('Error submitting response:', error);
      }
    }
  };

  const handleEvaluationSubmit = async (evaluation: ResponseEvaluationType) => {
    // Save the response data
    const responseData: GameResponse = {
      question: currentCard,
      response: currentResponse,
      responseTime: currentResponseTime,
      evaluation,
      level: currentLevel,
      playerId: currentTurn
    };
    
    setGameResponses(prev => [...prev, responseData]);
    setUsedCards(prev => [...prev, currentCard]);
    
    // Switch turns and get next card
    const nextTurn: PlayerTurn = currentTurn === 'player1' ? 'player2' : 'player1';
    setCurrentTurn(nextTurn);
    
    try {
      // Update game state
      await updateGameState({
        current_turn: nextTurn,
        current_phase: 'card-display',
        used_cards: [...usedCards, currentCard]
      });
      
      // Notify other player
      await syncAction('evaluation_submit', {
        evaluation,
        nextTurn,
        cardCompleted: currentCard
      });
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    }
    
    const nextCard = getNextCard();
    if (nextCard) {
      setCurrentCard(nextCard);
      setGamePhase('card-display');
      setShowCard(false);
      setTimeout(() => setShowCard(true), 300);
    }
  };

  const handleLevelUpConfirm = () => {
    // Simulate waiting for partner confirmation
    setWaitingForPartner(true);
    
    // Auto-confirm after 2 seconds for demo purposes
    setTimeout(() => {
      setWaitingForPartner(false);
      setShowLevelUpConfirmation(false);
      navigate(`/level-select?room=${roomCode}`);
    }, 2000);
  };

  const handleLevelUpCancel = () => {
    setShowLevelUpConfirmation(false);
    setWaitingForPartner(false);
  };

  const generateFinalReport = async () => {
    const connectionData = calculateConnectionScore(gameResponses);
    setConnectionData(connectionData);
    setGamePhase('final-report');
    
    // Update room status to finished
    try {
      await updateRoomStatus('finished');
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  const handlePlayAgain = () => {
    navigate(`/level-select?room=${roomCode}`);
  };

  const handleGoHome = () => {
    navigate(`/?room=${roomCode}`);
  };

  useEffect(() => {
    setShowCard(true);
  }, []);

  // Redirect to home if no room code
  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">No hay código de sala</p>
          <Button onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }
  
  // Show loading if we're trying to connect to a room
  if (roomCode && !isConnected && !room) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-heading text-foreground">
              {isRetrying ? `Reintentando conexión...` : 'Conectando a la sala...'}
            </h2>
            <p className="text-sm text-muted-foreground">Sala: {roomCode}</p>
            {retryCount > 0 && (
              <p className="text-xs text-orange-500">
                Intento {retryCount} de {maxRetries}
              </p>
            )}
          </div>
          
          {retryCount >= maxRetries && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                No se pudo conectar a la sala
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryConnection}
                  className="w-full"
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Reintentando...' : 'Reintentar conexión'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
               <p className="text-sm text-primary font-medium">
                 Turno: {currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2'} 
                 {isMyTurn ? ' (Tu turno)' : ' (Turno de tu pareja)'}
               </p>
            </div>
          </div>
        </div>


        {/* Game Content based on current phase */}
        {gamePhase === 'card-display' && (
          <>
            <GameCard
              currentCard={currentCard}
              currentLevel={currentLevel}
              showCard={showCard}
              cardIndex={usedCards.length}
              totalCards={totalCards}
            />

            {/* Action Button - Solo mostrar si es mi turno */}
            {isMyTurn && (
              <div className="space-y-3 pb-8">
                <Button 
                  onClick={handleStartResponse}
                  className="w-full h-12 text-base font-heading bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Responder
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setShowLevelUpConfirmation(true)}
                    variant="secondary"
                    className="h-10 text-sm"
                    disabled={currentLevel >= 3}
                  >
                    Subir nivel
                  </Button>
                  
                  <Button 
                    onClick={() => generateFinalReport()}
                    variant="destructive"
                    className="h-10 text-sm flex items-center gap-1"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Finalizar
                  </Button>
                </div>
              </div>
            )}

            {/* Mensaje para jugador que espera */}
            {!isMyTurn && (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">
                  Esperando que {currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2'} responda...
                </p>
              </div>
            )}
          </>
        )}

        {/* Response Input Modal */}
        <ResponseInput
          isVisible={gamePhase === 'response-input'}
          question={currentCard}
          onSubmitResponse={handleResponseSubmit}
          playerName={currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2'}
          isCloseProximity={isCloseProximity}
        />

        {/* Response Evaluation Modal */}
        <ResponseEvaluation
          isVisible={gamePhase === 'evaluation'}
          question={currentCard}
          response={currentResponse}
          responseTime={currentResponseTime}
          onEvaluate={handleEvaluationSubmit}
          partnerName={currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2'}
        />

        {/* Waiting for Evaluation Modal */}
        <WaitingForEvaluation
          isVisible={gamePhase === 'waiting-for-evaluation'}
          question={currentCard}
          response={partnerResponse || currentResponse}
          responseTime={partnerResponseTime || currentResponseTime}
          onEvaluate={handleEvaluationSubmit}
          isMyTurn={!isMyTurn} // Si no es mi turno responder, es mi turno evaluar
          partnerName={`Jugador ${playerNumber === 1 ? 2 : 1}`}
        />

        {/* Level Up Confirmation Modal */}
        <LevelUpConfirmation
          isVisible={showLevelUpConfirmation}
          currentLevel={currentLevel}
          cardsCompleted={usedCards.length}
          minimumRecommended={minimumRecommended}
          onConfirm={handleLevelUpConfirm}
          onCancel={handleLevelUpCancel}
          waitingForPartner={waitingForPartner}
        />

        {/* Final Connection Report Modal */}
        {connectionData && (
          <ConnectionReport
            isVisible={gamePhase === 'final-report'}
            connectionData={connectionData}
            onPlayAgain={handlePlayAgain}
            onGoHome={handleGoHome}
          />
        )}

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
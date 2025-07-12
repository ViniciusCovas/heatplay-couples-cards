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
import { useResponseData } from "@/hooks/useResponseData";
import { supabase } from "@/integrations/supabase/client";

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

  // Game state
  const [currentCard, setCurrentCard] = useState('');
  const [usedCards, setUsedCards] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('card-display');
  
  console.log('🎮 Game component initialized:', { 
    roomCode, 
    currentLevel, 
    room: room?.id,
    gamePhase,
    playerId,
    playerNumber
  });

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
  
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('player1');
  const [showCard, setShowCard] = useState(false);
  
  // Get proximity from game state
  const isCloseProximity = gameState?.proximity_response || false;
  
  // Response and evaluation data
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentResponseTime, setCurrentResponseTime] = useState(0);
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);
  
  // Use hook to fetch response data for evaluation phase
  const { responseData: evaluationResponseData } = useResponseData(
    room?.id || null,
    currentCard,
    usedCards.length + 1,
    gamePhase === 'evaluation' // Only fetch when in evaluation phase
  );

  // Determine if it's my turn based on player number and current turn
  const isMyTurn = (currentTurn === 'player1' && playerNumber === 1) || 
                   (currentTurn === 'player2' && playerNumber === 2);
  
  // Determine if I should be evaluating (opposite of who's responding)
  const shouldEvaluate = !isMyTurn && gameState?.current_phase === 'waiting-for-evaluation';
  
  console.log('🎯 Turn logic:', { 
    currentTurn, 
    playerNumber, 
    isMyTurn, 
    shouldEvaluate, 
    gamePhase: gameState?.current_phase 
  });
  
  // Sync with game state - this is the single source of truth
  useEffect(() => {
    if (gameState) {
      console.log('🔄 Syncing with game state:', gameState);
      
      // Update turn
      setCurrentTurn(gameState.current_turn);
      
      // Update card only if it exists in game state
      if (gameState.current_card && gameState.current_card !== currentCard) {
        console.log('📄 Card updated from game state:', gameState.current_card);
        setCurrentCard(gameState.current_card);
        setShowCard(false);
        setTimeout(() => setShowCard(true), 300);
      }
      
      // Update used cards
      if (gameState.used_cards) {
        setUsedCards(gameState.used_cards);
      }
      
      // Sync game phase based on database state and player logic
      const newPhase = deriveLocalPhase(gameState, playerNumber);
      if (newPhase !== gamePhase) {
        console.log('🎮 Phase changed:', { from: gamePhase, to: newPhase, reason: 'game state sync' });
        setGamePhase(newPhase);
      }
    }
  }, [gameState]);
  
  // Helper function to derive local phase from database state
  const deriveLocalPhase = (dbState: any, playerNum: number): GamePhase => {
    const isMyTurnInDB = (dbState.current_turn === 'player1' && playerNum === 1) || 
                         (dbState.current_turn === 'player2' && playerNum === 2);
    
    switch (dbState.current_phase) {
      case 'card-display':
        return 'card-display';
      case 'waiting-for-evaluation':
        // If it's waiting for evaluation, the evaluator should see 'evaluation'
        // and the responder should see 'waiting-for-evaluation'
        return isMyTurnInDB ? 'evaluation' : 'waiting-for-evaluation';
      default:
        return 'card-display';
    }
  };
  
  // No longer needed - we get response data from database via useResponseData hook
  
  // Level up confirmation
  const [showLevelUpConfirmation, setShowLevelUpConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  
  // Final report
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  
  const levelCards = SAMPLE_CARDS[currentLevel as keyof typeof SAMPLE_CARDS] || [];
  const totalCards = levelCards.length;
  const minimumRecommended = 6;

  // Initialize card only if not set by game state and it's my turn to generate
  useEffect(() => {
    if (levelCards.length > 0 && !currentCard && isMyTurn && gameState?.current_phase === 'card-display') {
      const availableCards = levelCards.filter(card => !usedCards.includes(card));
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        console.log('🎲 Generating new card (my turn):', randomCard);
        
        // Update database first, then local state will sync
        updateGameState({
          current_card: randomCard
        });
      }
    }
  }, [levelCards, usedCards, currentCard, isMyTurn, gameState?.current_phase]);

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
    if (isSubmitting || !room) {
      toast({
        title: "Error",
        description: "No se ha podido establecer conexión con la sala. Intenta de nuevo.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setCurrentResponse(response);
    setCurrentResponseTime(responseTime);

    try {
      // STEP 1: Save response to database
      const { error: responseError } = await supabase
        .from('game_responses')
        .insert({
          room_id: room.id, // Se ha corregido aquí para usar siempre un ID válido
          player_id: playerId,
          card_id: currentCard,
          response: response,
          response_time: Math.round(responseTime), // Convert to integer
          round_number: usedCards.length + 1
        });

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw responseError;
      }

      // In both close and far proximity modes, we need the partner to evaluate
      const partnerTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      
      console.log('📝 Response submitted, switching to evaluation phase:', {
        isCloseProximity,
        currentTurn,
        partnerTurn,
        respondingPlayer: currentTurn
      });
      
      // Update database: partner should be the evaluator
      await updateGameState({
        current_phase: 'waiting-for-evaluation',
        current_turn: partnerTurn // The partner will be in evaluation mode
      });
      
      // Notify the partner with the response data
      await syncAction('response_submit', {
        response,
        responseTime,
        question: currentCard,
        from: currentTurn,
        respondingPlayer: currentTurn
      });
      
      // The responding player waits for evaluation
      setGamePhase('waiting-for-evaluation');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la respuesta. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluationSubmit = async (evaluation: ResponseEvaluationType) => {
    try {
      console.log('📊 Starting evaluation submission:', { 
        evaluation, 
        currentCard, 
        currentTurn,
        playerNumber,
        roundNumber: usedCards.length + 1
      });

      // STEP 1: Get the original response from database for this round
      const { data: responseData, error: fetchError } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room?.id || '')
        .eq('card_id', currentCard)
        .eq('round_number', usedCards.length + 1)
        .single();

      if (fetchError || !responseData) {
        console.error('Error fetching response for evaluation:', fetchError);
        throw new Error('Response not found');
      }

      console.log('📥 Found response to evaluate:', responseData);

      // STEP 2: Save evaluation to database
      const { error: evalError } = await supabase
        .from('game_responses')
        .update({
          evaluation: JSON.stringify(evaluation),
          evaluation_by: playerId
        })
        .eq('id', responseData.id);

      if (evalError) {
        console.error('Error saving evaluation:', evalError);
        throw evalError;
      }

      // STEP 3: Save to local game responses for final report
      const gameResponseData: GameResponse = {
        question: currentCard,
        response: responseData.response, // Use response from database
        responseTime: responseData.response_time, // Use response time from database
        evaluation,
        level: currentLevel,
        playerId: responseData.player_id
      };
      
      setGameResponses(prev => [...prev, gameResponseData]);
      
      // STEP 4: Determine next turn - switch back to the next responder
      // The current turn in DB is the evaluator, so we need to switch to the next responder
      const nextResponseTurn: PlayerTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      
      const nextCard = getNextCard();
      
      if (nextCard) {
        console.log('🎯 Moving to next round:', { 
          nextCard, 
          nextResponseTurn, 
          completedCard: currentCard 
        });
        
        // Continue with next card - update database first
        await updateGameState({
          current_turn: nextResponseTurn, // Next player will respond
          current_phase: 'card-display',
          current_card: nextCard,
          used_cards: [...usedCards, currentCard]
        });
        
        // Clear response data
        setCurrentResponse('');
        setCurrentResponseTime(0);
        
        // Notify other player that evaluation is complete
        await syncAction('evaluation_submit', {
          evaluation,
          nextTurn: nextResponseTurn,
          nextCard,
          cardCompleted: currentCard
        });
      } else {
        // All cards completed for this level
        console.log('🏁 All cards completed for level', currentLevel);
        if (currentLevel >= 3) {
          await generateFinalReport();
        } else {
          setShowLevelUpConfirmation(true);
        }
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la evaluación",
        variant: "destructive"
      });
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
          isSubmitting={isSubmitting} // Añade esta línea
        />

        {/* Response Evaluation Modal */}
        <ResponseEvaluation
          isVisible={gamePhase === 'evaluation'}
          question={currentCard}
          response={evaluationResponseData?.response || ''}
          responseTime={evaluationResponseData?.responseTime || 0}
          onEvaluate={handleEvaluationSubmit}
          partnerName={`Jugador ${currentTurn === 'player1' ? 2 : 1}`}
        />

        {/* Waiting for Evaluation Modal */}
        <WaitingForEvaluation
          isVisible={gamePhase === 'waiting-for-evaluation'}
          question={currentCard}
          response={currentResponse} // My own response when waiting for evaluation
          responseTime={currentResponseTime}
          onEvaluate={handleEvaluationSubmit}
          isMyTurn={shouldEvaluate} // Use shouldEvaluate instead of isMyTurn
          partnerName={`Jugador ${currentTurn === 'player1' ? 1 : 2}`}
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
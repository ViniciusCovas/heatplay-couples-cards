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

type GamePhase = 'card-display' | 'response-input' | 'evaluation' | 'level-up-confirmation' | 'final-report' | 'waiting-for-evaluation';
type PlayerTurn = 'player1' | 'player2';

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { updateRoomStatus, room, joinRoom, isConnected, getPlayerNumber } = useRoomService();
  const playerId = usePlayerId();
  const playerNumber = getPlayerNumber(); // 1 o 2
  
  // Questions will be loaded from database
  const [levelCards, setLevelCards] = useState<string[]>([]);
  const [levelNames, setLevelNames] = useState<Record<number, string>>({});
  
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
  const { responseData: evaluationResponseData, isLoading: isLoadingResponseData, error: responseDataError } = useResponseData(
    room?.id || null,
    gameState?.current_card || currentCard,
    (gameState?.used_cards?.length || 0) + 1, // Use game state round number
    gamePhase === 'evaluation', // Only fetch when in evaluation phase
    playerId // Exclude my own responses
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
        
        // Extra protection: don't change away from final-report if we're already there
        if (gamePhase === 'final-report' && newPhase !== 'final-report' && room?.status !== 'finished') {
          console.log('🛡️ Protecting final-report phase from unwanted changes');
          return;
        }
        
        setGamePhase(newPhase);
      }
    }
  }, [gameState]);
  
  // Helper function to derive local phase from database state
  const deriveLocalPhase = (dbState: any, playerNum: number): GamePhase => {
    // Check if room is finished first - this overrides any phase logic
    if (room?.status === 'finished') {
      console.log('🏁 Game is finished, showing final report');
      return 'final-report';
    }
    
    const isMyTurnInDB = (dbState.current_turn === 'player1' && playerNum === 1) || 
                         (dbState.current_turn === 'player2' && playerNum === 2);
    
    console.log('🎯 deriveLocalPhase:', { 
      dbPhase: dbState.current_phase, 
      dbTurn: dbState.current_turn, 
      roomStatus: room?.status,
      playerNum, 
      isMyTurnInDB 
    });
    
    switch (dbState.current_phase) {
      case 'card-display':
        return 'card-display';
      case 'waiting-for-evaluation':
        // FIXED: currentTurn represents who should evaluate
        // If it's my turn in DB, I should evaluate
        // If it's not my turn in DB, I should wait for evaluation
        return isMyTurnInDB ? 'evaluation' : 'waiting-for-evaluation';
      case 'response-input':
        return isMyTurnInDB ? 'response-input' : 'card-display';
      case 'final-report':
        return 'final-report';
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
  
  const totalCards = levelCards.length;
  const minimumRecommended = 6;

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Get level information
        const { data: levelData, error: levelError } = await supabase
          .from('levels')
          .select('*')
          .eq('sort_order', currentLevel)
          .eq('is_active', true)
          .single();

        if (levelError) throw levelError;

        // Get questions for this level
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('text')
          .eq('level_id', levelData.id)
          .eq('is_active', true);

        if (questionsError) throw questionsError;

        const questions = questionsData.map(q => q.text);
        setLevelCards(questions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: levelData.name }));

        console.log('📚 Loaded questions:', { 
          level: currentLevel, 
          levelName: levelData.name, 
          questionCount: questions.length 
        });
      } catch (error) {
        console.error('Error fetching questions:', error);
        // Fallback to sample data
        const fallbackQuestions = [
          "¿Cuál fue tu primera impresión de mí?",
          "¿Qué es lo que más admiras de nuestra relación?",
          "¿Cuál es tu mayor sueño compartido?"
        ];
        setLevelCards(fallbackQuestions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: "Nivel " + currentLevel }));
      }
    };

    fetchQuestions();
  }, [currentLevel]);

  // Initialize card only if not set by game state and it's my turn to generate
  useEffect(() => {
    if (levelCards.length > 0 && 
        !gameState?.current_card && 
        isMyTurn && 
        gameState?.current_phase === 'card-display') {
      
      const usedCardsFromState = gameState?.used_cards || [];
      const availableCards = levelCards.filter(card => !usedCardsFromState.includes(card));
      
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        console.log('🎲 Generating new card (my turn):', { 
          randomCard, 
          availableCards: availableCards.length,
          usedCards: usedCardsFromState.length
        });
        
        // Update database first, then local state will sync
        updateGameState({
          current_card: randomCard
        });
      }
    }
  }, [levelCards, gameState?.current_card, gameState?.used_cards, isMyTurn, gameState?.current_phase]);

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


  const handleStartResponse = async () => {
    // Update database phase to response-input
    await updateGameState({
      current_phase: 'response-input'
    });
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
      // Use current game state for accurate round number
      const currentRound = (gameState?.used_cards?.length || 0) + 1;
      const currentCardFromState = gameState?.current_card || currentCard;
      
      console.log('📝 Submitting response:', { 
        response, 
        responseTime, 
        currentCardFromState, 
        currentRound,
        playerId,
        currentTurn 
      });

      // STEP 1: Save response to database
      const { error: responseError } = await supabase
        .from('game_responses')
        .insert({
          room_id: room.id,
          player_id: playerId,
          card_id: currentCardFromState,
          response: response,
          response_time: Math.round(responseTime),
          round_number: currentRound
        });

      if (responseError) {
        console.error('❌ Error saving response:', responseError);
        throw responseError;
      }

      console.log('✅ Response saved successfully');

      // STEP 2: Switch turn to the evaluator (the other player)
      const evaluatorTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      
      console.log('🔄 Switching to evaluation phase:', {
        respondingPlayer: currentTurn,
        evaluatorTurn,
        currentRound
      });
      
      // Update database: the other player will be the evaluator
      await updateGameState({
        current_phase: 'waiting-for-evaluation',
        current_turn: evaluatorTurn // This will make the other player the evaluator
      });
      
      // Notify the partner
      await syncAction('response_submit', {
        response,
        responseTime,
        question: currentCardFromState,
        from: currentTurn,
        round: currentRound
      });
      
      console.log('🎮 Local phase set to waiting-for-evaluation');
      setGamePhase('waiting-for-evaluation');
    } catch (error) {
      console.error('❌ Error submitting response:', error);
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
      // Use current game state for accurate data
      const currentRound = (gameState?.used_cards?.length || 0) + 1;
      const currentCardFromState = gameState?.current_card || currentCard;
      
      console.log('📊 Starting evaluation submission:', { 
        evaluation, 
        currentCardFromState, 
        currentTurn,
        playerNumber,
        roundNumber: currentRound
      });

      // STEP 1: Get the response that needs to be evaluated
      // We need to find the most recent response for this card/round that's NOT from the current player
      const { data: responseData, error: fetchError } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room?.id || '')
        .eq('card_id', currentCardFromState)
        .eq('round_number', currentRound)
        .neq('player_id', playerId) // Exclude my own responses
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 Response query result:', { 
        responseData, 
        fetchError,
        currentCard: currentCardFromState,
        round: currentRound,
        excludedPlayerId: playerId
      });

      if (fetchError || !responseData) {
        console.error('❌ Error fetching response for evaluation:', fetchError);
        throw new Error('Response not found for evaluation');
      }

      console.log('✅ Found response to evaluate:', responseData);

      // STEP 2: Save evaluation to database
      const { error: evalError } = await supabase
        .from('game_responses')
        .update({
          evaluation: JSON.stringify(evaluation),
          evaluation_by: playerId
        })
        .eq('id', responseData.id);

      if (evalError) {
        console.error('❌ Error saving evaluation:', evalError);
        throw evalError;
      }

      console.log('✅ Evaluation saved successfully');

      // STEP 3: Save to local game responses for final report
      const gameResponseData: GameResponse = {
        question: currentCardFromState,
        response: responseData.response,
        responseTime: responseData.response_time,
        evaluation,
        level: currentLevel,
        playerId: responseData.player_id
      };
      
      setGameResponses(prev => [...prev, gameResponseData]);
      
      // STEP 4: Determine next turn - FIXED LOGIC
      // The current turn is the evaluator. After evaluation, the evaluator becomes the next responder
      // This ensures players alternate: P1 responds -> P2 evaluates -> P2 responds -> P1 evaluates
      const nextResponseTurn: PlayerTurn = currentTurn; // Current evaluator becomes next responder
      
      const nextCard = getNextCard();
      
      if (nextCard) {
        console.log('🎯 Moving to next round:', { 
          nextCard, 
          nextResponseTurn, 
          completedCard: currentCardFromState,
          newUsedCards: [...(gameState?.used_cards || []), currentCardFromState],
          logic: 'evaluator becomes next responder'
        });
        
        // Continue with next card - update database first
        await updateGameState({
          current_turn: nextResponseTurn, // Evaluator becomes responder
          current_phase: 'card-display',
          current_card: nextCard,
          used_cards: [...(gameState?.used_cards || []), currentCardFromState]
        });
        
        // Clear response data
        setCurrentResponse('');
        setCurrentResponseTime(0);
        
        // Notify other player that evaluation is complete
        await syncAction('evaluation_submit', {
          evaluation,
          nextTurn: nextResponseTurn,
          nextCard,
          cardCompleted: currentCardFromState
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
      console.error('❌ Error submitting evaluation:', error);
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
    try {
      console.log('📊 Generating final report - fetching all game data from database');
      
      // Fetch all responses and evaluations from database for complete analysis
      const { data: allResponses, error } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room?.id || '')
        .not('response', 'is', null)
        .not('evaluation', 'is', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching game responses:', error);
        throw error;
      }

      console.log('📊 Retrieved responses for analysis:', allResponses);

      if (!allResponses || allResponses.length === 0) {
        console.log('⚠️ No responses found for analysis');
        toast({
          title: "Datos insuficientes",
          description: "No hay suficientes datos para generar el reporte de conexión",
          variant: "destructive"
        });
        return;
      }

      // Convert database responses to GameResponse format
      const formattedResponses: GameResponse[] = allResponses.map(response => ({
        question: response.card_id,
        response: response.response || '',
        responseTime: response.response_time || 0,
        evaluation: response.evaluation ? JSON.parse(response.evaluation) : {
          honesty: 0,
          attraction: 0,
          intimacy: 0,
          surprise: 0
        },
        level: currentLevel,
        playerId: response.player_id
      }));

      console.log('📊 Formatted responses for connection analysis:', formattedResponses);

      const connectionData = calculateConnectionScore(formattedResponses);
      setConnectionData(connectionData);
      
      console.log('🏁 Setting game to finished state');
      
      // Sync the final report to both players
      await syncAction('game_finish', {
        connectionData: connectionData,
        message: 'Game finished'
      });
      
      // Update room status to finished (this will trigger deriveLocalPhase to return 'final-report')
      await updateRoomStatus('finished');
      
      // Set local phase after database updates
      setGamePhase('final-report');
    } catch (error) {
      console.error('❌ Error generating final report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte final",
        variant: "destructive"
      });
    }
  };

  const handlePlayAgain = () => {
    navigate('/');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleChangeLevel = async () => {
    try {
      await syncAction('change_level_request', {
        message: 'Player wants to change level'
      });
      navigate(`/level-select?room=${roomCode}`);
    } catch (error) {
      console.error('❌ Error requesting level change:', error);
      toast({
        title: "Error",
        description: "No se pudo solicitar el cambio de nivel",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    setShowCard(true);
    
    // Listen for game finish events from partner
    const handleGameFinish = (event: CustomEvent) => {
      console.log('🏁 Received game finish event from partner');
      const { connectionData } = event.detail;
      if (connectionData) {
        setConnectionData(connectionData);
      }
      setGamePhase('final-report');
    };

    // Listen for level change requests from partner
    const handleChangeLevelRequest = (event: CustomEvent) => {
      console.log('🎯 Received level change request from partner');
      navigate(`/level-select?room=${roomCode}`);
    };

    window.addEventListener('gameFinish', handleGameFinish as EventListener);
    window.addEventListener('changeLevelRequest', handleChangeLevelRequest as EventListener);

    return () => {
      window.removeEventListener('gameFinish', handleGameFinish as EventListener);
      window.removeEventListener('changeLevelRequest', handleChangeLevelRequest as EventListener);
    };
  }, [roomCode, navigate]);

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
              Nivel {currentLevel}: {levelNames[currentLevel] || `Nivel ${currentLevel}`}
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
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={handleChangeLevel}
                    variant="outline"
                    className="h-10 text-sm"
                  >
                    Cambiar nivel
                  </Button>
                  
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

            {/* Mensaje para jugador que espera - también puede cambiar nivel */}
            {!isMyTurn && (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Esperando que {currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2'} responda...
                </p>
                <Button 
                  onClick={handleChangeLevel}
                  variant="outline"
                  className="h-10 text-sm"
                >
                  Cambiar nivel
                </Button>
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

        {/* Response Evaluation Modal - FIXED: Added key to reset state */}
        <ResponseEvaluation
          key={`${gameState?.current_card}-${currentTurn}-${(gameState?.used_cards?.length || 0) + 1}`}
          isVisible={gamePhase === 'evaluation'}
          question={gameState?.current_card || currentCard}
          response={evaluationResponseData?.response || ''}
          responseTime={evaluationResponseData?.responseTime || 0}
          onEvaluate={handleEvaluationSubmit}
          partnerName={`Jugador ${currentTurn === 'player1' ? 2 : 1}`}
        />
        
        {/* Debug info for evaluation issues */}
        {gamePhase === 'evaluation' && (
          <div className="fixed top-4 right-4 bg-background/90 p-2 rounded text-xs max-w-xs z-50">
            <p>🎯 Debug Info:</p>
            <p>Phase: {gamePhase}</p>
            <p>Turn: {currentTurn}</p>
            <p>Player: {playerNumber}</p>
            <p>Card: {gameState?.current_card?.substring(0, 20)}...</p>
            <p>Response: {evaluationResponseData?.response ? 'Found' : 'Loading...'}</p>
            <p>Error: {responseDataError || 'None'}</p>
            <p>Loading: {isLoadingResponseData ? 'Yes' : 'No'}</p>
          </div>
        )}

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
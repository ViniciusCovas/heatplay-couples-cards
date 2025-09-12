import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, Home, Users, Play, BarChart3, Timer, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GameCard } from "@/components/game/GameCard";
import { ResponseInput } from "@/components/game/ResponseInput";
import { useTranslation } from 'react-i18next';

import { LevelUpConfirmation } from "@/components/game/LevelUpConfirmation";
import { ConnectionReport, type ConnectionData } from "@/components/game/ConnectionReport";
import { ResponseEvaluation, type EvaluationData } from "@/components/game/ResponseEvaluation";
import { LanguageIndicator } from "@/components/ui/language-indicator";

import { calculateConnectionScore, type GameResponse } from "@/utils/connectionAlgorithm";
import { useRoomService } from "@/hooks/useRoomService";
import { useGameSync } from "@/hooks/useGameSync";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { useGameRealTimeState } from "@/hooks/useGameRealTimeState";
import { RealTimeIndicators } from "@/components/game/RealTimeIndicators";

type GamePhase = 'card-display' | 'response-input' | 'evaluation' | 'waiting-for-evaluation' | 'waiting-for-partner-response' | 'level-up-confirmation' | 'final-report';
type PlayerTurn = 'player1' | 'player2';

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { 
    room, 
    participants, 
    playerNumber,
    updateRoomStatus,
    joinRoom, 
    syncRoomState,
    isConnected 
  } = useRoomService();
  const { playerId, isReady: playerIdReady } = usePlayerId();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Questions will be loaded from database
  const [levelCards, setLevelCards] = useState<{id: string, text: string}[]>([]);
  const [levelNames, setLevelNames] = useState<Record<number, string>>({});
  
  // Get game sync data
  const { gameState, syncAction, updateGameState } = useGameSync(room?.id || null, playerId, playerNumber || undefined);
  
  const roomCode = searchParams.get('room');
  const currentLevel = parseInt(searchParams.get('level') || '1');

  // Room connection state management
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isRoomLoaded, setIsRoomLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const connectionAttemptRef = useRef(false);

  // System readiness and player ID resolution
  // CRITICAL FIX: For anonymous users, always use playerId (not user?.id)
  // For authenticated users, use their auth ID for database consistency
  const effectivePlayerId = user?.id || playerId;
  
  // Real-time state management
  const { 
    gameState: realTimeState, 
    forceReconnect, 
    processImmediately
  } = useGameRealTimeState({
    roomId: room?.id || null,
    playerId: effectivePlayerId
  });
  const isSystemReady = playerIdReady && !authLoading && !!effectivePlayerId;
  
  // Debug logging for player ID resolution
  logger.debug('Player ID resolution', {
    userId: user?.id,
    playerId,
    effectivePlayerId,
    isAuthenticated: !!user,
    isSystemReady
  });

  // Game state
  const [currentCard, setCurrentCard] = useState(''); // This stores the question ID
  const [usedCards, setUsedCards] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('card-display');
  
  // Transition state for evaluation processing
  const [isProcessingEvaluation, setIsProcessingEvaluation] = useState(false);
  const [transitionFeedback, setTransitionFeedback] = useState<{
    message: string;
    isMyNextTurn: boolean;
  } | null>(null);
  
  // Timer state - Enhanced for proper pause/resume functionality
  const [cardDisplayStartTime, setCardDisplayStartTime] = useState<number>(0);
  const [timerPaused, setTimerPaused] = useState<boolean>(false);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  
  logger.debug('Game component initialized', { 
    roomCode, 
    currentLevel, 
    room: room?.id,
    gamePhase,
    playerId,
    playerNumber,
    isSystemReady,
    isConnected,
    isJoiningRoom,
    isRoomLoaded,
    connectionError
  });

  // Emergency sync when game state is out of sync
  const forceGameSync = useCallback(async () => {
    if (!room?.id || !gameState) return;
    
    logger.info('Forcing game state sync', { 
      dbPhase: gameState.current_phase,
      dbCard: gameState.current_card,
      dbTurn: gameState.current_turn,
      localCard: currentCard,
      localPhase: gamePhase
    });
    
    // Force immediate sync with database state
    if (gameState.current_card && gameState.current_card !== currentCard) {
      setCurrentCard(gameState.current_card);
      setShowCard(true);
    }
    
    if (gameState.current_phase && gameState.current_phase !== gamePhase) {
      setGamePhase(gameState.current_phase as GamePhase);
    }
    
    // Process any pending queue items
    await processImmediately();
  }, [room?.id, gameState, currentCard, gamePhase, processImmediately]);
  
  // Automatic state mismatch detection and correction
  useEffect(() => {
    if (!gameState || !room?.id) return;
    
    // Check for critical mismatches that need immediate fixing
    const hasCardMismatch = gameState.current_card && 
                           gameState.current_card !== currentCard && 
                           gameState.current_phase === 'card-display';
                           
    const hasPhaseMismatch = gameState.current_phase && 
                            gameState.current_phase !== gamePhase;
    
    if (hasCardMismatch || hasPhaseMismatch) {
      logger.warn('Detected game state mismatch - auto-syncing', {
        hasCardMismatch,
        hasPhaseMismatch,
        dbCard: gameState.current_card,
        localCard: currentCard,
        dbPhase: gameState.current_phase,
        localPhase: gamePhase
      });
      
      // Auto-trigger sync after a short delay to prevent loops
      setTimeout(() => {
        forceGameSync();
      }, 1000);
    }
  }, [gameState, currentCard, gamePhase, room?.id, forceGameSync]);

  // Room initialization logic
  useEffect(() => {
    const initializeRoomConnection = async () => {
      if (!roomCode) {
        setConnectionError(t('game.errors.noRoomCodeInUrl'));
        return;
      }

      if (!isSystemReady) {
        logger.debug('System not ready, delaying room initialization', { playerIdReady, authLoading, effectivePlayerId });
        return;
      }

      // Prevent duplicate connection attempts
      if (connectionAttemptRef.current || (isConnected && room?.id && isRoomLoaded)) {
        logger.debug('Connection already in progress or established', {
          connectionAttemptRef: connectionAttemptRef.current,
          isConnected,
          roomId: room?.id,
          isRoomLoaded
        });
        return;
      }

      connectionAttemptRef.current = true;
      setIsJoiningRoom(true);
      setConnectionError(null);
      logger.info('Attempting to initialize room connection', { roomCode, effectivePlayerId });

      try {
        // Check if player is already a participant
        const { data: currentRoomData, error: roomFetchError } = await supabase
          .from('game_rooms')
          .select('id, room_code, status')
          .eq('room_code', roomCode)
          .single();

        if (roomFetchError || !currentRoomData) {
          throw new Error(t('game.errors.roomNotFound'));
        }

        const { data: existingParticipant, error: participantError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', currentRoomData.id)
          .eq('player_id', effectivePlayerId)
          .single();

        let success = false;
        if (existingParticipant) {
          logger.info('Player is existing participant, syncing room state', { roomCode });
          success = await syncRoomState(roomCode);
        } else {
          logger.info('Player not a participant, joining room', { roomCode });
          success = await joinRoom(roomCode);
        }

        if (success) {
          logger.info('Room connection established successfully');
          setIsRoomLoaded(true);
          setRetryCount(0);
        } else {
          throw new Error(t('game.errors.failedToEstablishConnection'));
        }
      } catch (error: any) {
        logger.error('Room connection initialization failed', error);
        setConnectionError(error.message || t('game.errors.roomConnectionFailed'));

        // Retry logic
        if (retryCount < 3) {
          const retryDelay = 2000 * (retryCount + 1);
          logger.warn(`Retrying connection in ${retryDelay / 1000}s. Attempt ${retryCount + 1}/3`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connectionAttemptRef.current = false;
          }, retryDelay);
        } else {
          toast({
            title: t('common.error'),
            description: t('game.errors.maxRetriesReached'),
            variant: "destructive",
          });
          setTimeout(() => navigate('/'), 3000);
        }
      } finally {
        if (retryCount >= 3 || connectionError === null) {
          setIsJoiningRoom(false);
          connectionAttemptRef.current = false;
        }
      }
    };

    if (!room?.id || !isConnected || !isRoomLoaded) {
      initializeRoomConnection();
    }

    return () => {
      connectionAttemptRef.current = false;
    };
  }, [
    roomCode,
    isSystemReady,
    isConnected,
    room?.id,
    joinRoom,
    syncRoomState,
    navigate,
    toast,
    t,
    retryCount,
    effectivePlayerId,
    isRoomLoaded,
  ]);

  // Track when room connection is established
  useEffect(() => {
    if (isConnected && room?.id && !isJoiningRoom) {
      setIsRoomLoaded(true);
      logger.info('Room connection confirmed, setting isRoomLoaded to true');
    } else if (!isConnected || !room?.id) {
      setIsRoomLoaded(false);
    }
  }, [isConnected, room?.id, isJoiningRoom]);

  // RESET GAME STATE WHEN LEVEL CHANGES
  useEffect(() => {
    logger.debug('Level changed - resetting local game state', { currentLevel });
    
    // Reset all local game state when level changes
    setCurrentCard('');
    setUsedCards([]);
    setProgress(0);
    setGamePhase('card-display');
    
    // Clear any pending evaluation data
    setPendingEvaluation(null);
    
    // DON'T clear AI info immediately - let it persist through level changes
    // Only clear it when we actually generate a new card
    
    logger.debug('Local game state reset for new level (AI info preserved)', { currentLevel });
  }, [currentLevel]);

  // Room joining is now handled by centralized useRoomManager in App.tsx
  // This component only focuses on game logic

  // Connection retry removed - centralized room manager handles this
  
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('player1');
  const [showCard, setShowCard] = useState(false);
  const [showResponseInput, setShowResponseInput] = useState(false);
  
  // Evaluation state
  const [pendingEvaluation, setPendingEvaluation] = useState<{
    question: string;
    response: string;
    responseId: string;
    playerName: string;
  } | null>(null);
  
  // Get proximity from game state
  const isCloseProximity = gameState?.proximity_response || false;
  
  // Response data
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);

  // Determine if it's my turn based on player number and current turn
  // Use single source from useRoomService
  const isMyTurn = (currentTurn === 'player1' && playerNumber === 1) || 
                   (currentTurn === 'player2' && playerNumber === 2);
  
  
  logger.debug('Turn logic', { 
    currentTurn, 
    playerNumber,
    isMyTurn, 
    gamePhase: gameState?.current_phase 
  });
  
  // Helper function to derive local phase from database state
  const deriveLocalPhase = (dbState: any, playerNum: number): GamePhase => {
    // Check if room is finished first - this overrides any phase logic
    if (room?.status === 'finished') {
      logger.info('Game is finished, showing final report');
      return 'final-report';
    }
    
    const isMyTurnInDB = (dbState.current_turn === 'player1' && playerNum === 1) || 
                         (dbState.current_turn === 'player2' && playerNum === 2);
    
    const subTurn = dbState.question_sub_turn || 'first_response';
    
    logger.debug('deriveLocalPhase', { 
      dbPhase: dbState.current_phase, 
      dbTurn: dbState.current_turn, 
      subTurn,
      roomStatus: room?.status,
      playerNum, 
      isMyTurnInDB 
    });
    
    switch (dbState.current_phase) {
      case 'card-display':
        return 'card-display';
      case 'response-input':
        return 'card-display'; // Always show card first, use local state for response input
      case 'evaluation':
        // In evaluation phase: evaluator gets 'evaluation', other player shows waiting
        if (isMyTurnInDB) {
          return 'evaluation';
        } else {
          // Player being evaluated shows waiting state with question context
          return 'waiting-for-evaluation';
        }
      case 'final-report':
        return 'final-report';
      default:
        return 'card-display';
    }
  };
  
  // Main sync useEffect - handles ALL phase transitions based on database state
  useEffect(() => {
    if (gameState) {
      logger.debug('Syncing with game state', { gameState });
      
      // Update turn
      setCurrentTurn(gameState.current_turn);
      
      // Update card ALWAYS if it exists in game state and differs from current
      if (gameState.current_card && gameState.current_card !== currentCard) {
        logger.info('Card updated from game state - syncing UI', { 
          newCard: gameState.current_card, 
          oldCard: currentCard,
          gamePhase: gameState.current_phase 
        });
        setCurrentCard(gameState.current_card);
        setShowCard(false);
        // FIXED: Changed from 300ms to 700ms to match CSS transition duration
        setTimeout(() => setShowCard(true), 700);
        
        // If we're in card-display phase and it's my turn, start the timer
        if (gameState.current_phase === 'card-display' && isMyTurn) {
          logger.info('Starting timer for synced card display');
          setTimeout(() => startTimer(), 700); // Start timer after card animation
        }
      }
      
      // Update used cards
      if (gameState.used_cards) {
        setUsedCards(gameState.used_cards);
      }
      
      // Sync game phase based on database state and player logic - ONLY source of phase changes
      const newPhase = deriveLocalPhase(gameState, playerNumber || 1);
      if (newPhase !== gamePhase) {
        logger.info('Phase changed via deriveLocalPhase', { 
          from: gamePhase, 
          to: newPhase, 
          dbPhase: gameState.current_phase,
          dbTurn: gameState.current_turn,
          roomStatus: room?.status
        });
        
        setGamePhase(newPhase);
      }
    }
  }, [gameState, gamePhase, playerNumber, room?.status, currentCard]);

  // Debug effect to track critical state changes
  useEffect(() => {
    logger.debug('Critical state update', { 
      playerNumber,
      gamePhase,
      currentTurn: gameState?.current_turn,
      currentPhase: gameState?.current_phase,
      isMyTurn: gameState?.current_turn === `player${playerNumber}`,
      participants: participants.length,
      participantsList: participants.map(p => ({ id: p.player_id, number: p.player_number }))
    });
  }, [playerNumber, participants, gamePhase, gameState?.current_turn, gameState?.current_phase]);

  // Set up evaluation data when entering evaluation phase
  useEffect(() => {
    const setupEvaluationData = async () => {
      if (gamePhase === 'evaluation' && gameState && room && !pendingEvaluation) {
        logger.debug('Setting up evaluation data for evaluator');
        
        try {
          // Get the current round number
          const currentRound = (gameState.used_cards?.length || 0) + 1;
          const currentCardFromState = gameState.current_card;
          
          // Fetch the latest response that needs evaluation for the current card/round
          const { data: responseData, error } = await supabase
            .from('game_responses')
            .select('*')
            .eq('room_id', room.id)
            .eq('card_id', currentCardFromState || '')
            .eq('round_number', currentRound)
            .is('evaluation', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            logger.error('Error fetching response for evaluation', error);
            return;
          }

          if (responseData) {
            // GUARD: Prevent evaluating own response
            if (responseData.player_id === effectivePlayerId) {
              logger.warn('Cannot evaluate own response, skipping evaluation setup', {
                responsePlayerId: responseData.player_id,
                currentPlayerId: effectivePlayerId
              });
              return;
            }
            
            // Get partner's name based on their player ID
            const partnerName = responseData.player_id !== effectivePlayerId ? 
              (playerNumber === 1 ? t('game.player2') : t('game.player1')) : 
              t('game.yourResponse');

            setPendingEvaluation({
              question: getQuestionTextByCardId(responseData.card_id),
              response: responseData.response || '',
              responseId: responseData.id,
              playerName: partnerName
            });

            logger.info('Evaluation data set up successfully for partner response');
          }
        } catch (error) {
          logger.error('Error setting up evaluation data', error);
        }
      }
    };

    setupEvaluationData();
  }, [gamePhase, gameState, room, pendingEvaluation, effectivePlayerId, playerNumber, t]);
  
  // Level up confirmation
  const [showLevelUpConfirmation, setShowLevelUpConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  
  // Final report
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  
  const totalCards = levelCards.length;
  const minimumRecommended = 6;

  // Helper function to get current card text safely
  const getCurrentCardText = () => {
    if (!currentCard || !levelCards.length) {
      return '';
    }
    
    const card = levelCards.find(card => card.id === currentCard);
    if (card) {
      return card.text;
    }
    
    // Fallback: try to get card text from database if levelCards is empty
    logger.warn('getCurrentCardText: Card not found in levelCards, returning ID as fallback', { currentCard });
    return currentCard;
  };

  // Helper function to get question text by card ID
  const getQuestionTextByCardId = (cardId: string) => {
    const question = levelCards.find(q => q.id === cardId);
    return question?.text || cardId; // Fallback to ID if text not found
  };

  // Track previous language to detect changes
  const [prevLanguage, setPrevLanguage] = useState(i18n.language);
  
  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!isRoomLoaded || !room?.id) {
        logger.debug('Skipping question fetch: room not loaded', { isRoomLoaded, roomId: room?.id });
        return;
      }

      try {
        // Use room's selected language if available, otherwise fall back to UI language
        const gameLanguage = gameState?.selected_language || i18n.language;
        logger.debug('Fetching questions', { gameLanguage, currentLevel, roomLanguage: gameState?.selected_language });
        
        // Get level information
        const { data: levelData, error: levelError } = await supabase
          .from('levels')
          .select('*')
          .eq('sort_order', currentLevel)
          .eq('language', gameLanguage)
          .eq('is_active', true)
          .single();

        if (levelError) throw levelError;

        // Get questions for this level
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, text')
          .eq('level_id', levelData.id)
          .eq('language', gameLanguage)
          .eq('is_active', true);

        if (questionsError) throw questionsError;

        const questions = questionsData.map(q => ({ id: q.id, text: q.text }));
        setLevelCards(questions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: levelData.name }));

        logger.debug('Loaded questions', { 
          level: currentLevel, 
          levelName: levelData.name, 
          questionCount: questions.length,
          gameLanguage: gameLanguage,
          uiLanguage: i18n.language,
          roomLanguage: gameState?.selected_language,
          questions: questions.map(q => q.text).slice(0, 3) // Show first 3 questions for debugging
        });
        
        // If game language changed, reset the game state for new language
        const currentGameLanguage = gameState?.selected_language || i18n.language;
        if (prevLanguage !== currentGameLanguage) {
          logger.info('Game language changed - resetting game state', { from: prevLanguage, to: currentGameLanguage });
          
          // Clear current card and used cards to start fresh with new language
          if (gameState?.current_card) {
            await updateGameState({
              current_card: null,
              used_cards: []
            });
          }
          
          setPrevLanguage(currentGameLanguage);
        }
        
      } catch (error) {
        logger.error('Error fetching questions', error);
        // Fallback to sample data
        const fallbackQuestions = [
          { id: 'fallback-1', text: t('game.fallbackQuestions.question1') },
          { id: 'fallback-2', text: t('game.fallbackQuestions.question2') },
          { id: 'fallback-3', text: t('game.fallbackQuestions.question3') }
        ];
        setLevelCards(fallbackQuestions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: t('game.level', { level: currentLevel }) }));
      }
    };

    fetchQuestions();
  }, [currentLevel, i18n.language, gameState?.current_card, gameState?.selected_language, updateGameState, prevLanguage, isRoomLoaded, room?.id]);

  // AI-powered card generation state - PERSISTENT across level changes
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [aiCardInfo, setAiCardInfo] = useState<{
    reasoning?: string;
    targetArea?: string;
    selectionMethod?: string;
  } | null>(null);

  // Enhanced AI card info debugging
  useEffect(() => {
    logger.debug('AI Card Info state changed', { 
      aiCardInfo, 
      currentCard,
      hasReasoning: Boolean(aiCardInfo?.reasoning),
      hasTargetArea: Boolean(aiCardInfo?.targetArea),
      selectionMethod: aiCardInfo?.selectionMethod
    });
  }, [aiCardInfo, currentCard]);

  // Enhanced intelligent card selection using AI - ALWAYS TRY AI FIRST
  const selectCardWithAI = async (roomId: string, currentLevel: number, language: string, isFirstQuestion: boolean = false) => {
    try {
      // Use room's language for AI selection
      const gameLanguage = gameState?.selected_language || language;
      logger.info('Starting AI card selection', { roomId, currentLevel, language: gameLanguage, isFirstQuestion });
      setIsGeneratingCard(true);
      
      const { data, error } = await supabase.functions.invoke('intelligent-question-selector', {
        body: { 
          roomId,
          currentLevel,
          language: gameLanguage,
          isFirstQuestion
        }
      });

      if (error) {
        logger.warn('AI selection failed, falling back to random', error);
        return { 
          cardId: null, 
          reasoning: null, 
          targetArea: null, 
          selectionMethod: 'ai_failure' 
        };
      }

      if (data?.question && data?.reasoning) {
        logger.info('AI selected card successfully', { 
          question: data.question.text,
          reasoning: data.reasoning,
          targetArea: data.targetArea,
          selectionMethod: data.selectionMethod,
          isFirstQuestion
        });
        
        return {
          cardId: data.question.id,
          reasoning: data.reasoning,
          targetArea: data.targetArea,
          selectionMethod: data.selectionMethod || 'ai_intelligent'
        };
      }
      
      logger.warn('AI selection returned invalid data, falling back to random');
      return { 
        cardId: null, 
        reasoning: null, 
        targetArea: null, 
        selectionMethod: 'ai_failure' 
      };
    } catch (error) {
      logger.warn('AI selection error, falling back to random', error);
      return { 
        cardId: null, 
        reasoning: null, 
        targetArea: null, 
        selectionMethod: 'ai_failure' 
      };
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Initialize card only if not set by game state and it's my turn to generate
  useEffect(() => {
    const generateCard = async () => {
      if (!isRoomLoaded || !room?.id || !isConnected) {
        logger.debug('Skipping card generation: room not ready', { isRoomLoaded, roomId: room?.id, isConnected });
        return;
      }

      if (levelCards.length > 0 && 
          !gameState?.current_card && 
          isMyTurn && 
          gameState?.current_phase === 'card-display' &&
          room && !isGeneratingCard) {
        
        const usedCardsFromState = gameState?.used_cards || [];
        const availableCards = levelCards.filter(card => !usedCardsFromState.includes(card.id));
        
        if (availableCards.length > 0) {
          // ALWAYS try AI selection first - for ALL cards, not just first
          const isFirstQuestion = usedCardsFromState.length === 0;
          
          logger.debug('Attempting AI card generation for ALL cards', { 
            isFirstQuestion, 
            availableCards: availableCards.length,
            currentLevel,
            language: i18n.language
          });
          
          // Try AI selection with current level number - FOR ALL CARDS
          const aiResult = await selectCardWithAI(room.id, currentLevel, i18n.language, isFirstQuestion);
          
          let selectedCard = aiResult.cardId;
          let updatesForGameState: any = {};
          
          // IMPROVED: Handle AI success or failure atomically to prevent intermediate UI states
          if (selectedCard && aiResult.reasoning) {
            // AI selection successful - save all AI data to database
            updatesForGameState = {
              current_card: selectedCard,
              current_card_ai_reasoning: aiResult.reasoning,
              current_card_ai_target_area: aiResult.targetArea,
              current_card_selection_method: aiResult.selectionMethod
            };
            
            logger.info('AI selection successful, updating database atomically', { updatesForGameState });
          } else {
            // AI failed - use random selection and clear AI data atomically
            const randomQuestion = availableCards[Math.floor(Math.random() * availableCards.length)];
            selectedCard = randomQuestion.id;
            updatesForGameState = {
              current_card: selectedCard,
              current_card_ai_reasoning: null,
              current_card_ai_target_area: null,
              current_card_selection_method: 'random_fallback'
            };
            
            logger.info('Using random card fallback, updating database atomically', { 
              selectedCard, 
              selectedText: randomQuestion.text,
              availableCards: availableCards.length,
              usedCards: usedCardsFromState.length,
              isFirstQuestion
            });
          }
          
          // Update database with all data at once - this will sync to both players atomically
          // This prevents the intermediate "ai.randomfallback" state from showing in UI
          await updateGameState(updatesForGameState);
          
          logger.info('Card generation completed and synced atomically to database', { updatesForGameState });
        }
      }
    };

    generateCard();
  }, [levelCards, gameState?.current_card, gameState?.used_cards, isMyTurn, gameState?.current_phase, room, isGeneratingCard, currentLevel, i18n.language, isRoomLoaded, isConnected]);

  useEffect(() => {
    setProgress((usedCards.length / totalCards) * 100);
  }, [usedCards, totalCards]);

  // Deterministic card selection based on database state
  const getNextCardDeterministic = (usedCardsFromDB: string[], levelCardsArray: any[], roundNumber: number) => {
    const availableCards = levelCardsArray.filter(card => !usedCardsFromDB.includes(card.id));
    if (availableCards.length === 0) {
      return null;
    }
    
    // Use round number as seed for deterministic selection
    // This ensures all players get the same card based on the same database state
    const deterministicIndex = roundNumber % availableCards.length;
    return availableCards[deterministicIndex].id;
  };

  const startTimer = () => {
    logger.debug('Starting timer');
    setCardDisplayStartTime(Date.now());
    setTimerPaused(false);
    setPausedTime(0);
  };

  const pauseTimer = () => {
    if (!timerPaused && cardDisplayStartTime > 0) {
      logger.debug('Pausing timer');
      const elapsedTime = Date.now() - cardDisplayStartTime;
      setPausedTime(elapsedTime);
      setTimerPaused(true);
    }
  };

  const resumeTimer = () => {
    if (timerPaused) {
      logger.debug('Resuming timer');
      setCardDisplayStartTime(Date.now() - pausedTime);
      setTimerPaused(false);
    }
  };

  const resetTimer = () => {
    logger.debug('Resetting timer');
    setCardDisplayStartTime(0);
    setTimerPaused(false);
    setPausedTime(0);
  };

  // Calculate actual response time including paused time
  const getActualResponseTime = (): number => {
    if (cardDisplayStartTime === 0) return 0;
    
    if (timerPaused) {
      return pausedTime / 1000; // Convert to seconds
    } else {
      return (Date.now() - cardDisplayStartTime) / 1000; // Convert to seconds
    }
  };

  const handleStartResponse = async () => {
    // Pause timer when response starts
    pauseTimer();
    
    // For spoken mode (close proximity), submit response directly without showing modal
    if (isCloseProximity) {
      const responseTime = getActualResponseTime();
      await handleResponseSubmit(t('game.spokenResponse'), responseTime);
      return;
    }
    
    // For written mode, show the response input modal
    setShowResponseInput(true);
    
    // Update database phase to response-input
    await updateGameState({
      current_phase: 'response-input'
    });
  };

  const handleResponseSubmit = async (response: string, responseTimeFromModal: number) => {
    // Use the actual response time from timer, not from modal
    const actualResponseTime = getActualResponseTime();
    
    if (isSubmitting || !room) {
      toast({
        title: t('common.error'),
        description: t('game.errors.connectionLost'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Use current game state for accurate round number
      const currentRound = (gameState?.used_cards?.length || 0) + 1;
      const currentCardFromState = gameState?.current_card || currentCard;
      
      logger.info('Submitting response with timer data', { 
        response, 
        actualResponseTime, 
        currentCardFromState,
        currentRound,
        effectivePlayerId,
        currentTurn,
        aiCardInfo: aiCardInfo,
        selectionMethod: aiCardInfo?.selectionMethod || 'random',
        aiReasoning: aiCardInfo?.reasoning || null
      });

      // Save response to database WITH timing information and comprehensive logging
      logger.info('Phase 5 Validation: Submitting response', {
        phase: 'response_submit',
        playerNumber,
        isPlayerATurn: playerNumber === 1,
        currentRound,
        responseLength: response.length,
        actualResponseTime,
        cardId: currentCardFromState
      });

      const { error: responseError } = await supabase
        .from('game_responses')
        .insert({
          room_id: room.id,
          player_id: effectivePlayerId,
          card_id: currentCardFromState,
          response: response,
          response_time: Math.round(actualResponseTime), // Store actual timer-based response time
          round_number: currentRound,
          selection_method: aiCardInfo?.selectionMethod || 'random',
          ai_reasoning: aiCardInfo?.reasoning || null
        });

      if (responseError) {
        logger.error('Error saving response', responseError);
        throw responseError;
      }

      logger.info('Response saved successfully with accurate timing data');

      // Reset timer after successful submission
      resetTimer();

      // Hide the response input modal
      setShowResponseInput(false);
      
      // Transition to evaluation phase - other player evaluates
      const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      logger.info('Response submitted, moving to evaluation phase for other player');
      await updateGameState({
        current_turn: nextTurn,
        current_phase: 'evaluation'
      });
      
    } catch (error) {
      logger.error('Error submitting response', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.responseSaveFailed'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEvaluationSubmit = async (evaluation: EvaluationData) => {
    if (!pendingEvaluation || !room) {
      toast({
        title: t('common.error'),
        description: t('game.errors.connectionLost'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // CRITICAL FIX: Ensure we're using the correct evaluating player ID
      // The evaluating player should be the one who DIDN'T write the response
      let evaluatingPlayerId = effectivePlayerId;
      
      logger.info('Phase 5 Validation: Starting evaluation submission', {
        phase: 'evaluation_submit',
        evaluatingPlayerNumber: playerNumber,
        evaluatingPlayerId,
        responseId: pendingEvaluation.responseId,
        roomId: room.id
      });
      
      // Get the response details to find who wrote it
      const { data: responseData, error: responseError } = await supabase
        .from('game_responses')
        .select('player_id, round_number')
        .eq('id', pendingEvaluation.responseId)
        .single();
        
      if (responseError) {
        logger.error('Error fetching response data', responseError);
        throw responseError;
      }
      
      // Validate that evaluating player is different from responding player
      if (responseData?.player_id === effectivePlayerId) {
        logger.error('Self-evaluation attempt detected', {
          responsePlayerId: responseData.player_id,
          evaluatingPlayerId: effectivePlayerId
        });
        
        toast({
          title: t('common.error'),
          description: 'Cannot evaluate your own response',
          variant: "destructive",
        });
        return;
      }

      logger.info('Submitting evaluation with detailed context', { 
        evaluation, 
        responseId: pendingEvaluation.responseId,
        responsePlayerId: responseData.player_id,
        evaluatingPlayerId,
        roomId: room.id
      });

      // Enhanced evaluation data to include timing insights
      const enhancedEvaluation = {
        ...evaluation,
        timing_context: {
          evaluation_timestamp: Date.now()
        }
      };

      // Save evaluation to database with improved error handling and comprehensive logging
      logger.info('About to submit evaluation to database', {
        responseId: pendingEvaluation.responseId,
        evaluatingPlayerId,
        evaluation: enhancedEvaluation,
        roomId: room.id
      });

      const { error: evaluationError } = await supabase
        .from('game_responses')
        .update({
          evaluation: JSON.stringify(enhancedEvaluation),
          evaluation_by: evaluatingPlayerId
        })
        .eq('id', pendingEvaluation.responseId);

      if (evaluationError) {
        logger.error('Database evaluation error details', {
          error: evaluationError,
          code: evaluationError.code,
          message: evaluationError.message,
          details: evaluationError.details,
          hint: evaluationError.hint
        });
        
        // Enhanced error handling for specific database errors
        if (evaluationError.message?.includes('Player cannot evaluate their own response')) {
          toast({
            title: 'Evaluation Error',
            description: 'You cannot evaluate your own response. Please wait for your partner to evaluate.',
            variant: "destructive",
          });
        } else {
          toast({
            title: 'Database Error',
            description: `Failed to save evaluation: ${evaluationError.message}`,
            variant: "destructive",
          });
        }
        
        throw evaluationError;
      }

      logger.info('Evaluation saved successfully - trigger should fire now', {
        responseId: pendingEvaluation.responseId,
        evaluatingPlayerId,
        roomId: room.id,
        timestamp: new Date().toISOString()
      });

      // Wait a moment for trigger to execute and check for sync events
      setTimeout(async () => {
        const { data: syncEvents, error: syncError } = await supabase
          .from('game_sync')
          .select('*')
          .eq('room_id', room.id)
          .eq('action_type', 'evaluation_complete')
          .order('created_at', { ascending: false })
          .limit(1);

        if (syncError) {
          logger.error('Error checking sync events', syncError);
        } else {
          logger.info('Sync events after evaluation', { syncEvents });
          if (!syncEvents || syncEvents.length === 0) {
            logger.error('CRITICAL: No evaluation_complete sync event generated by trigger!');
          }
        }
      }, 1000);

      // Show success feedback immediately
      toast({
        title: t('game.evaluation.submitted'),
        description: t('game.evaluation.processing'),
        variant: "default",
      });

      // Database trigger will handle advancing to next round automatically
      // Delay clearing pendingEvaluation to prevent immediate modal disappearance
      setTimeout(() => {
        setPendingEvaluation(null);
      }, 300);
      
    } catch (error: any) {
      logger.error('Comprehensive evaluation submission error', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        effectivePlayerId,
        pendingEvaluation,
        roomId: room?.id
      });
      
      toast({
        title: t('common.error'),
        description: error?.message || t('game.errors.evaluationSaveFailed'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluationCancel = () => {
    setPendingEvaluation(null);
    // Database state will trigger phase update via useEffect
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
      logger.info('Generating final report - fetching all game data from database');
      
      // Fetch all responses and evaluations from database for complete analysis
      const { data: allResponses, error } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room?.id || '')
        .not('response', 'is', null)
        .not('evaluation', 'is', null)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching game responses', error);
        throw error;
      }

      logger.debug('Retrieved responses for analysis', { responseCount: allResponses?.length });

      if (!allResponses || allResponses.length === 0) {
        logger.warn('No responses found for analysis');
        toast({
          title: t('game.errors.insufficientData'),
          description: t('game.errors.insufficientDataDescription'),
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

      logger.debug('Formatted responses for connection analysis', { responseCount: formattedResponses.length });

      const connectionData = calculateConnectionScore(formattedResponses);
      setConnectionData(connectionData);
      
      logger.info('Setting game to finished state');
      
      // Sync the final report to both players
      await syncAction('game_finish', {
        connectionData: connectionData,
        message: 'Game finished'
      });
      
      // Update room status to finished (deriveLocalPhase will handle phase transition)
      await updateRoomStatus('finished');
    } catch (error) {
      logger.error('Error generating final report', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.finalReportFailed'),
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
      await syncAction('level_change_request', {
        roomCode,
        currentLevel,
        message: 'Player wants to change level'
      });
      navigate(`/level-select?room=${roomCode}`);
    } catch (error) {
      logger.error('Error requesting level change', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.levelChangeFailed'),
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    setShowCard(true);
    
    // Start timer when card is displayed in card-display phase
    if (gamePhase === 'card-display' && currentCard && isMyTurn) {
      startTimer();
    }
    
    // Reset timer when it's not my turn
    if (!isMyTurn) {
      resetTimer();
    }
    
    // Listen for game finish events from partner
    const handleGameFinish = (event: CustomEvent) => {
      logger.info('Received game finish event from partner');
      const { connectionData } = event.detail;
      if (connectionData) {
        setConnectionData(connectionData);
      }
      // deriveLocalPhase will handle phase transition based on room status
    };

    // Listen for level change requests from partner
    const handleChangeLevelRequest = (event: CustomEvent) => {
      logger.info('Received level change request from partner');
      navigate(`/level-select?room=${roomCode}`);
    };

    // Phase 5 Validation: Track complete game flow pattern
    const validateGameFlow = async () => {
      if (!room?.id) return;
      
      try {
        const { data: responses, error } = await supabase
          .from('game_responses')
          .select('*')
          .eq('room_id', room.id)
          .order('round_number');
        
        if (error) {
          logger.error('Error fetching game flow data', error);
          return;
        }
        
        const totalResponses = responses?.filter(r => r.response).length || 0;
        const totalEvaluations = responses?.filter(r => r.evaluation).length || 0;
        
        logger.info('Phase 5 Game Flow Validation', {
          totalResponses,
          totalEvaluations,
          currentPhase: gameState?.current_phase,
          currentTurn: gameState?.current_turn,
          gameProgressionCorrect: totalEvaluations <= 6,
          pattern: responses?.map(r => ({
            round: r.round_number,
            hasResponse: !!r.response,
            hasEvaluation: !!r.evaluation,
            respondingPlayer: r.player_id,
            evaluatingPlayer: r.evaluation_by
          }))
        });
        
      } catch (error) {
        logger.error('Game flow validation error', error);
      }
    };

    // Handle partner response events
    const handlePartnerResponse = (event: CustomEvent) => {
      logger.info('Received partner response event');
      validateGameFlow(); // Validate after each response
      // UI feedback is handled by the toast in useGameSync
    };

    // Handle evaluation received events
    const handleEvaluationReceived = (event: CustomEvent) => {
      const { evaluation, question, response, evaluator, round } = event.detail;
      
      logger.info('Evaluation received for my response', {
        evaluation,
        question: question?.substring(0, 50),
        round
      });
      
      // Show evaluation feedback
      toast({
        title: t('game.notifications.evaluationTitle'),
        description: t('game.notifications.evaluationMessage'),
        variant: "default",
      });
    };

    // Handle evaluation processing with 3-second transition
    const handleEvaluationProcessing = (event: CustomEvent) => {
      const { isMyNextTurn, gameFinished } = event.detail;
      
      logger.info('Evaluation processing started', { isMyNextTurn, gameFinished });
      
      if (gameFinished) {
        // Game is finished, don't show processing state
        return;
      }
      
      setIsProcessingEvaluation(true);
      setTransitionFeedback({
        message: isMyNextTurn ? 
          t('game.processing.yourTurnNext') : 
          t('game.processing.waitingForPartner'),
        isMyNextTurn
      });
      
      // Clear processing state after 3 seconds
      setTimeout(() => {
        setIsProcessingEvaluation(false);
        setTransitionFeedback(null);
      }, 3000);
    };

    window.addEventListener('gameFinish', handleGameFinish as EventListener);
    window.addEventListener('changeLevelRequest', handleChangeLevelRequest as EventListener);
    window.addEventListener('partnerResponse', handlePartnerResponse as EventListener);
    window.addEventListener('evaluationReceived', handleEvaluationReceived as EventListener);
    window.addEventListener('evaluationProcessing', handleEvaluationProcessing as EventListener);

    return () => {
      window.removeEventListener('gameFinish', handleGameFinish as EventListener);
      window.removeEventListener('changeLevelRequest', handleChangeLevelRequest as EventListener);
      window.removeEventListener('partnerResponse', handlePartnerResponse as EventListener);
      window.removeEventListener('evaluationReceived', handleEvaluationReceived as EventListener);
      window.removeEventListener('evaluationProcessing', handleEvaluationProcessing as EventListener);
    };
  }, [roomCode, navigate, gamePhase, currentCard, isMyTurn, t, toast]);

  // Timer update effect for real-time display - Enhanced with pause support
  useEffect(() => {
    if (gamePhase === 'card-display' && cardDisplayStartTime > 0 && !timerPaused) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [gamePhase, cardDisplayStartTime, timerPaused]);

  // Redirect to home if no room code
  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">{t('game.noRoomCode')}</p>
          <Button onClick={() => navigate('/')}>
            {t('common.backToHome')}
          </Button>
        </Card>
      </div>
    );
  }
  
  // Enhanced loading states
  if (!isRoomLoaded || !room?.id || !isConnected || isJoiningRoom) {
    let loadingMessage = t('game.connectingToRoom');
    if (!isSystemReady) {
      loadingMessage = t('game.initializingPlayer');
    } else if (isJoiningRoom) {
      loadingMessage = t('game.joiningRoom');
    } else if (!isRoomLoaded || !room?.id) {
      loadingMessage = t('game.loadingGameData');
    }

    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-heading text-foreground">
              {loadingMessage}
            </h2>
            {roomCode && <p className="text-sm text-muted-foreground">{t('game.room')}: {roomCode}</p>}
            {connectionError && (
              <p className="text-sm text-destructive">{connectionError}</p>
            )}
          </div>

          {(connectionError || retryCount >= 3 || (!isConnected && !isJoiningRoom)) && (
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
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
            <LanguageIndicator />
            <div className="flex items-center">
              <Users className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="text-xs font-mono text-muted-foreground">{roomCode}</span>
            </div>
          </div>
          
          {/* Real-time Connection Indicators - Fixed to use actual connection data */}
          <RealTimeIndicators
            isConnected={isConnected && realTimeState.isConnected}
            opponentConnected={realTimeState.opponentConnected}
            lastPing={realTimeState.lastPing}
            isWaitingForOpponent={gamePhase === 'evaluation' && !isMyTurn}
            timeRemaining={realTimeState.timeRemaining}
            className="justify-center"
          />
          
          {/* Debug sync button - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceGameSync}
              className="text-xs"
            >
              Force Sync
            </Button>
          )}
          
          <div className="space-y-1">
            <h1 className="text-xl font-heading text-foreground">
              {t('game.levelTitle', { level: currentLevel, name: levelNames[currentLevel] || t('game.level', { level: currentLevel }) })}
            </h1>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {t('game.cardsCompleted', { completed: usedCards.length, total: totalCards })}
              </p>
               <p className="text-sm text-primary font-medium">
                 {t('game.turn')}: {currentTurn === 'player1' ? t('game.player1') : t('game.player2')} 
                 {isMyTurn ? t('game.yourTurn') : t('game.partnerTurn')}
               </p>
            </div>
          </div>
        </div>

         {/* Game Content based on current phase */}
        {gamePhase === 'card-display' && (
          <>
            <GameCard
              currentCard={getCurrentCardText()}
              currentLevel={currentLevel}
              showCard={showCard}
              cardIndex={usedCards.length}
              totalCards={totalCards}
              aiReasoning={gameState?.current_card_ai_reasoning}
              aiTargetArea={gameState?.current_card_ai_target_area}
              selectionMethod={gameState?.current_card_selection_method}
              isGeneratingCard={isGeneratingCard}
              aiFailureReason={isGeneratingCard ? undefined : (!aiCardInfo?.reasoning ? "Insufficient game history" : undefined)}
              subTurn={gameState?.question_sub_turn}
              questionProgress={{
                current: gameState?.current_card_index || 1,
                total: 6,
                subPhase: gameState?.question_sub_turn === 'second_response' ? '2nd response' : 
                         gameState?.question_sub_turn === 'first_response' ? '1st response' : 
                         'evaluating'
              }}
            />

            {/* Enhanced timer display with pause state */}
            {currentCard && cardDisplayStartTime > 0 && isMyTurn && (
              <div className="text-center py-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-mono ${
                  timerPaused ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'
                }`}>
                  <Timer className={`w-4 h-4 ${timerPaused ? 'text-orange-500' : ''}`} />
                  {timerPaused ? (
                    <span>{Math.floor(pausedTime / 1000)}s (paused)</span>
                  ) : (
                    <span>{Math.floor((currentTime - cardDisplayStartTime) / 1000)}s</span>
                  )}
                </div>
              </div>
            )}

            {/* Action Button - Only show if it's my turn and NOT in evaluation phase */}
            {isMyTurn && gameState?.current_phase !== 'evaluation' && (
              <div className="space-y-3 pb-8">
                <Button 
                  onClick={handleStartResponse}
                  className="w-full h-12 text-base font-heading bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t('game.respond')}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleChangeLevel}
                    variant="outline"
                    className="h-10 text-sm"
                  >
                    {t('game.changeLevel')}
                  </Button>
                  
                  <Button 
                    onClick={() => generateFinalReport()}
                    variant="destructive"
                    className="h-10 text-sm flex items-center gap-1"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {t('game.finish')}
                  </Button>
                </div>
              </div>
            )}

            {/* Message for waiting player */}
            {!isMyTurn && gamePhase === 'card-display' && (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  {gameState?.current_phase === 'evaluation' 
                    ? t('game.waitingForEvaluation', { player: currentTurn === 'player1' ? t('game.player1') : t('game.player2') })
                    : t('game.waitingForResponse', { player: currentTurn === 'player1' ? t('game.player1') : t('game.player2') })
                  }
                </p>
                <Button 
                  onClick={handleChangeLevel}
                  variant="outline"
                  className="h-10 text-sm"
                >
                  {t('game.changeLevel')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Waiting for Evaluation Phase */}
        {gamePhase === 'waiting-for-evaluation' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-heading text-foreground">
                {t('game.waitingForEvaluation')}
              </h2>
              <p className="text-muted-foreground">
                Your partner is evaluating your response to this question
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 border border-border/30">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Question you just answered:
              </h3>
              <p className="text-foreground/90 text-lg leading-relaxed">
                {getCurrentCardText()}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <span>Round {gameState?.current_card_index || 1} of 6</span>
              <span>•</span>
              <span>{gameState?.question_sub_turn === 'first_evaluation' ? '1/2 responses' : '2/2 responses'}</span>
            </div>
          </div>
        )}

         {/* Response Input Modal - Enhanced with timer pause functionality */}
        <ResponseInput
          isVisible={showResponseInput}
          question={currentCard}
          onSubmitResponse={handleResponseSubmit}
          playerName={currentTurn === 'player1' ? t('game.player1') : t('game.player2')}
          isCloseProximity={isCloseProximity}
          isSubmitting={isSubmitting}
          startTime={cardDisplayStartTime}
          pausedTime={pausedTime}
          isPaused={timerPaused}
        />

         {/* Response Evaluation Modal - Show only for evaluation phase and not processing */}
         {pendingEvaluation && gamePhase === 'evaluation' && !isProcessingEvaluation && (
           <ResponseEvaluation
             isVisible={true}
             question={pendingEvaluation.question}
             response={pendingEvaluation.response}
             playerName={pendingEvaluation.playerName}
             onSubmitEvaluation={handleEvaluationSubmit}
             onCancel={handleEvaluationCancel}
             isSubmitting={isSubmitting}
           />
         )}

         {/* Processing Evaluation Transition */}
         {isProcessingEvaluation && (
           <div className="fixed inset-0 romantic-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <Card className="w-full max-w-md p-8 space-y-6 romantic-card text-center animate-scale-in">
               <div className="flex justify-center">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-lg font-brand font-semibold text-foreground">
                   {t('game.processing.title')}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   {t('game.processing.description')}
                 </p>
                 {transitionFeedback && (
                   <div className={`mt-4 p-3 rounded-lg border ${
                     transitionFeedback.isMyNextTurn 
                       ? 'bg-green-50 border-green-200 text-green-800' 
                       : 'bg-blue-50 border-blue-200 text-blue-800'
                   }`}>
                     <p className="text-sm font-medium">
                       {transitionFeedback.message}
                     </p>
                   </div>
                 )}
               </div>
             </Card>
           </div>
         )}

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
          roomId={room?.id}
          language={i18n.language}
        />
        )}

        {/* Safety Note */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            💜 {t('game.safetyNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Game;

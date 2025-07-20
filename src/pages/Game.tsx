import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, Home, Users, Play, BarChart3 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

type GamePhase = 'card-display' | 'response-input' | 'evaluation' | 'level-up-confirmation' | 'final-report';
type PlayerTurn = 'player1' | 'player2';

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { 
    room, 
    participants, 
    playerNumber,
    updateRoomStatus,
    joinRoom, 
    isConnected 
  } = useRoomService();
  const playerId = usePlayerId();
  
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

  // RESET GAME STATE WHEN LEVEL CHANGES
  useEffect(() => {
    console.log('🔄 Level changed - resetting local game state:', { currentLevel });
    
    // Reset all local game state when level changes
    setCurrentCard('');
    setUsedCards([]);
    setProgress(0);
    setGamePhase('card-display');
    
    // Clear any pending evaluation data
    setPendingEvaluation(null);
    
    console.log('✅ Local game state reset for new level:', currentLevel);
  }, [currentLevel]);

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
              title: t('game.errors.connectionError'),
              description: t('game.errors.connectionFailed', { roomCode, maxRetries }),
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
              title: t('game.errors.connectionError'),
              description: t('game.errors.verifyRoomCode'),
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
  const [showResponseInput, setShowResponseInput] = useState(false);
  
  // Get proximity from game state
  const isCloseProximity = gameState?.proximity_response || false;
  
  // Response data
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);
  
  // Evaluation state
  const [pendingEvaluation, setPendingEvaluation] = useState<{
    question: string;
    response: string;
    responseId: string;
    playerName: string;
  } | null>(null);
  

  // Determine if it's my turn based on player number and current turn
  const isMyTurn = (currentTurn === 'player1' && playerNumber === 1) || 
                   (currentTurn === 'player2' && playerNumber === 2);
  
  
  console.log('🎯 Turn logic:', { 
    currentTurn, 
    playerNumber, 
    isMyTurn, 
    gamePhase: gameState?.current_phase 
  });
  
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
      case 'response-input':
        return 'card-display'; // Always show card first, use local state for response input
      case 'evaluation':
        // In evaluation phase: evaluator gets 'evaluation', other player gets 'card-display'
        return isMyTurnInDB ? 'evaluation' : 'card-display';
      case 'final-report':
        return 'final-report';
      default:
        return 'card-display';
    }
  };
  
  // Main sync useEffect - handles ALL phase transitions based on database state
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
      
      // Sync game phase based on database state and player logic - ONLY source of phase changes
      const newPhase = deriveLocalPhase(gameState, playerNumber);
      if (newPhase !== gamePhase) {
        console.log('🎮 Phase changed via deriveLocalPhase:', { 
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
    console.log('🔄 Critical state update:', { 
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
        console.log('🔄 Setting up evaluation data for evaluator');
        
        try {
          // Get the current round number
          const currentRound = (gameState.used_cards?.length || 0) + 1;
          const currentCardFromState = gameState.current_card;
          
          // Fetch the latest response that needs evaluation for the current card/round
          const { data: responseData, error } = await supabase
            .from('game_responses')
            .select('*')
            .eq('room_id', room.id)
            .eq('card_id', currentCardFromState)
            .eq('round_number', currentRound)
            .is('evaluation', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error) {
            console.error('❌ Error fetching response for evaluation:', error);
            return;
          }

          if (responseData) {
            // Get partner's name based on their player ID
            const partnerName = responseData.player_id !== playerId ? 
              (playerNumber === 1 ? t('game.player2') : t('game.player1')) : 
              t('game.yourResponse');

            setPendingEvaluation({
              question: responseData.card_id,
              response: responseData.response || '',
              responseId: responseData.id,
              playerName: partnerName
            });

            console.log('✅ Evaluation data set up successfully for partner response');
          }
        } catch (error) {
          console.error('❌ Error setting up evaluation data:', error);
        }
      }
    };

    setupEvaluationData();
  }, [gamePhase, gameState, room, pendingEvaluation, playerId, playerNumber, t]);
  
  // Level up confirmation
  const [showLevelUpConfirmation, setShowLevelUpConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  
  // Final report
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  
  const totalCards = levelCards.length;
  const minimumRecommended = 6;

  // Track previous language to detect changes
  const [prevLanguage, setPrevLanguage] = useState(i18n.language);
  
  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log('🌍 Fetching questions for language:', i18n.language, 'level:', currentLevel);
        
        // Get level information
        const { data: levelData, error: levelError } = await supabase
          .from('levels')
          .select('*')
          .eq('sort_order', currentLevel)
          .eq('language', i18n.language)
          .eq('is_active', true)
          .single();

        if (levelError) throw levelError;

        // Get questions for this level
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('text')
          .eq('level_id', levelData.id)
          .eq('language', i18n.language)
          .eq('is_active', true);

        if (questionsError) throw questionsError;

        const questions = questionsData.map(q => q.text);
        setLevelCards(questions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: levelData.name }));

        console.log('📚 Loaded questions:', { 
          level: currentLevel, 
          levelName: levelData.name, 
          questionCount: questions.length,
          language: i18n.language
        });
        
        // If language changed, reset the game state for new language
        if (prevLanguage !== i18n.language) {
          console.log('🔄 Language changed from', prevLanguage, 'to', i18n.language, '- resetting game state');
          
          // Clear current card and used cards to start fresh with new language
          if (gameState?.current_card) {
            await updateGameState({
              current_card: null,
              used_cards: []
            });
          }
          
          setPrevLanguage(i18n.language);
        }
        
      } catch (error) {
        console.error('Error fetching questions:', error);
        // Fallback to sample data
        const fallbackQuestions = [
          t('game.fallbackQuestions.question1'),
          t('game.fallbackQuestions.question2'),
          t('game.fallbackQuestions.question3')
        ];
        setLevelCards(fallbackQuestions);
        setLevelNames(prev => ({ ...prev, [currentLevel]: t('game.level', { level: currentLevel }) }));
      }
    };

    fetchQuestions();
  }, [currentLevel, i18n.language, gameState?.current_card, updateGameState, prevLanguage]);

  // AI-powered card generation state
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [aiCardInfo, setAiCardInfo] = useState<{
    reasoning?: string;
    targetArea?: string;
    selectionMethod?: string;
  } | null>(null);

  // Enhanced intelligent card selection using AI - now works from first question
  const selectCardWithAI = async (roomId: string, levelId: string, language: string, isFirstQuestion: boolean = false) => {
    try {
      console.log('🧠 Trying AI card selection...', { isFirstQuestion });
      setIsGeneratingCard(true);
      
      const { data, error } = await supabase.functions.invoke('intelligent-question-selector', {
        body: { 
          roomId,
          currentLevel: levelId,
          language,
          isFirstQuestion
        }
      });

      if (error) {
        console.warn('⚠️ AI selection failed, falling back to random:', error);
        return null;
      }

      if (data?.question && data?.reasoning) {
        console.log('✅ AI selected card:', { 
          question: data.question.text,
          reasoning: data.reasoning,
          targetArea: data.targetArea,
          isFirstQuestion
        });
        
        setAiCardInfo({
          reasoning: data.reasoning,
          targetArea: data.targetArea,
          selectionMethod: data.selectionMethod
        });
        
        return data.question.text;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ AI selection error, falling back to random:', error);
      return null;
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Initialize card only if not set by game state and it's my turn to generate
  useEffect(() => {
    const generateCard = async () => {
      if (levelCards.length > 0 && 
          !gameState?.current_card && 
          isMyTurn && 
          gameState?.current_phase === 'card-display' &&
          room && !isGeneratingCard) {
        
        const usedCardsFromState = gameState?.used_cards || [];
        const availableCards = levelCards.filter(card => !usedCardsFromState.includes(card));
        
        if (availableCards.length > 0) {
          // Always try AI selection first - now includes first question
          const isFirstQuestion = usedCardsFromState.length === 0;
          let selectedCard = null;
          
          // Get current level data for AI selection
          const { data: levelData } = await supabase
            .from('levels')
            .select('id')
            .eq('sort_order', currentLevel)
            .eq('language', i18n.language)
            .eq('is_active', true)
            .single();
            
          if (levelData) {
            selectedCard = await selectCardWithAI(room.id, levelData.id, i18n.language, isFirstQuestion);
          }
          
          // Fallback to random selection if AI fails
          if (!selectedCard) {
            selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
            setAiCardInfo(null); // Clear AI info for random selection
            console.log('🎲 Using random card fallback:', { 
              selectedCard, 
              availableCards: availableCards.length,
              usedCards: usedCardsFromState.length,
              isFirstQuestion
            });
          }
          
          // Update database first, then local state will sync
          await updateGameState({
            current_card: selectedCard
          });
        }
      }
    };

    generateCard();
  }, [levelCards, gameState?.current_card, gameState?.used_cards, isMyTurn, gameState?.current_phase, room, isGeneratingCard, currentLevel, i18n.language]);

  useEffect(() => {
    setProgress((usedCards.length / totalCards) * 100);
  }, [usedCards, totalCards]);

  // Deterministic card selection based on database state
  const getNextCardDeterministic = (usedCardsFromDB: string[], levelCardsArray: string[], roundNumber: number) => {
    const availableCards = levelCardsArray.filter(card => !usedCardsFromDB.includes(card));
    if (availableCards.length === 0) {
      return null;
    }
    
    // Use round number as seed for deterministic selection
    // This ensures all players get the same card based on the same database state
    const deterministicIndex = roundNumber % availableCards.length;
    return availableCards[deterministicIndex];
  };

  const handleStartResponse = async () => {
    // Show the response input modal locally
    setShowResponseInput(true);
    
    // Update database phase to response-input
    await updateGameState({
      current_phase: 'response-input'
    });
  };

  const handleResponseSubmit = async (response: string, responseTime: number) => {
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
      
      console.log('📝 Submitting response:', { 
        response, 
        responseTime, 
        currentCardFromState, 
        currentRound,
        playerId,
        currentTurn 
      });

      // Save response to database
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

      // Hide the response input modal
      setShowResponseInput(false);
      
      // Transition to evaluation phase - other player evaluates
      const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      console.log('✅ Response submitted, moving to evaluation phase for other player');
      await updateGameState({
        current_turn: nextTurn,
        current_phase: 'evaluation'
      });
      
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.responseSaveFailed'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Centralized function to advance to the next round
  const advanceToNextRound = async (completedQuestion: string) => {
    if (!room || !gameState) return;

    console.log('🎯 Advancing to next round after completing:', completedQuestion);

    // Calculate the round number based on current used cards + the completed question
    const currentUsedCards = gameState.used_cards || [];
    const nextRoundNumber = currentUsedCards.length + 1;
    
    // Use deterministic card selection based on database state
    const nextCard = getNextCardDeterministic(currentUsedCards, levelCards, nextRoundNumber);
    
    // FIX: Determine who should answer next based on who answered the previous question
    // currentTurn is the evaluator, so the answerer was the other player
    // The next answerer should be the current evaluator (who just finished evaluating)
    const nextTurn = currentTurn; // The evaluator becomes the next answerer
    
    console.log('🔄 Turn switching logic:', {
      currentTurn: currentTurn,
      nextTurn: nextTurn,
      explanation: `${currentTurn} just evaluated, so ${nextTurn} will answer next`
    });
    
    if (nextCard) {
      // Continue with next question
      const newUsedCards = [...currentUsedCards, completedQuestion];
      
      console.log('🎯 Moving to next card (deterministic):', {
        nextCard,
        nextTurn,
        newUsedCards: newUsedCards.length,
        currentLevel,
        roundNumber: nextRoundNumber
      });
      
      await updateGameState({
        current_card: nextCard,
        used_cards: newUsedCards,
        current_turn: nextTurn,
        current_phase: 'response-input'
      });
      
      return { nextCard, nextTurn };
    } else {
      // No more cards, finish level
      console.log('🏁 No more cards available - finishing level:', currentLevel);
      
      if (currentLevel >= 4) {
        generateFinalReport();
      } else {
        navigate(`/level-select?room=${roomCode}`);
      }
      return null;
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
      console.log('📊 Submitting evaluation:', { evaluation, responseId: pendingEvaluation.responseId });

      // Save evaluation to database
      const { error: evaluationError } = await supabase
        .from('game_responses')
        .update({
          evaluation: JSON.stringify(evaluation),
          evaluation_by: playerId
        })
        .eq('id', pendingEvaluation.responseId);

      if (evaluationError) {
        console.error('❌ Error saving evaluation:', evaluationError);
        throw evaluationError;
      }

      console.log('✅ Evaluation saved successfully');

      // Call centralized function to advance to next round
      await advanceToNextRound(pendingEvaluation.question);
      
      setPendingEvaluation(null);
    } catch (error) {
      console.error('❌ Error submitting evaluation:', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.evaluationSaveFailed'),
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

      console.log('📊 Formatted responses for connection analysis:', formattedResponses);

      const connectionData = calculateConnectionScore(formattedResponses);
      setConnectionData(connectionData);
      
      console.log('🏁 Setting game to finished state');
      
      // Sync the final report to both players
      await syncAction('game_finish', {
        connectionData: connectionData,
        message: 'Game finished'
      });
      
      // Update room status to finished (deriveLocalPhase will handle phase transition)
      await updateRoomStatus('finished');
    } catch (error) {
      console.error('❌ Error generating final report:', error);
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
      console.error('❌ Error requesting level change:', error);
      toast({
        title: t('common.error'),
        description: t('game.errors.levelChangeFailed'),
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
      // deriveLocalPhase will handle phase transition based on room status
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
          <p className="text-muted-foreground">{t('game.noRoomCode')}</p>
          <Button onClick={() => navigate('/')}>
            {t('common.backToHome')}
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
              {isRetrying ? t('game.retryingConnection') : t('game.connectingToRoom')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('game.room')}: {roomCode}</p>
            {retryCount > 0 && (
              <p className="text-xs text-orange-500">
                {t('game.attempt', { current: retryCount, max: maxRetries })}
              </p>
            )}
          </div>
          
          {retryCount >= maxRetries && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                {t('game.connectionFailed')}
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryConnection}
                  className="w-full"
                  disabled={isRetrying}
                >
                  {isRetrying ? t('game.retrying') : t('game.retryConnection')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {t('common.backToHome')}
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
            <LanguageIndicator />
            <div className="flex items-center">
              <Users className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="text-xs font-mono text-muted-foreground">{roomCode}</span>
            </div>
          </div>
          
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
              currentCard={currentCard}
              currentLevel={currentLevel}
              showCard={showCard}
              cardIndex={usedCards.length}
              totalCards={totalCards}
              aiReasoning={aiCardInfo?.reasoning}
              aiTargetArea={aiCardInfo?.targetArea}
              selectionMethod={aiCardInfo?.selectionMethod}
            />

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
            {!isMyTurn && (
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

        {/* Response Input Modal */}
        <ResponseInput
          isVisible={showResponseInput}
          question={currentCard}
          onSubmitResponse={handleResponseSubmit}
          playerName={currentTurn === 'player1' ? t('game.player1') : t('game.player2')}
          isCloseProximity={isCloseProximity}
          isSubmitting={isSubmitting}
        />

         {/* Response Evaluation Modal - Show only for evaluation phase */}
         {pendingEvaluation && gamePhase === 'evaluation' && (
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

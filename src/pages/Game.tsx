import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { GameCard } from '@/components/game/GameCard';
import { ProximityAnswer } from '@/components/game/ProximityAnswer';
import { ResponseInput } from '@/components/game/ResponseInput';
import { Evaluation } from '@/components/game/Evaluation';
import { GameFinish } from '@/components/game/GameFinish';
import { useQuestions } from '@/hooks/useQuestions';
import { useGameSync } from '@/hooks/useGameSync';
import { ProximitySelection } from './ProximitySelection';
import { ProximityQuestion } from '@/components/game/ProximityQuestion';
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AICardInfo {
  reasoning?: string;
  targetArea?: string;
  selectionMethod?: string;
}

export default function Game() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('room');
  const playerId = localStorage.getItem('player_id') || '';
  const [currentCard, setCurrentCard] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [showCard, setShowCard] = useState(false);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [aiCardInfo, setAiCardInfo] = useState<AICardInfo | null>(null);
  const [partnerResponse, setPartnerResponse] = useState<any | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationScores, setEvaluationScores] = useState<any | null>(null);
  const [showGameFinish, setShowGameFinish] = useState(false);
  const [gameResult, setGameResult] = useState<any | null>(null);
  const [showProximityQuestion, setShowProximityQuestion] = useState(false);
  const [showProximityAnswer, setShowProximityAnswer] = useState(false);
  const [showLevelMismatchAlert, setShowLevelMismatchAlert] = useState(false);
  const { t, i18n } = useTranslation();
  const { questions, getQuestionsForLevel, markQuestionAsUsed } = useQuestions();
  const { gameState, syncAction, updateGameState, isLoading } = useGameSync(roomId, playerId);

  // Debug language consistency
  console.log('🌍 Game page language:', i18n.language);

  // Event listener for partner responses
  useEffect(() => {
    const handlePartnerResponse = (event: any) => {
      setPartnerResponse(event.detail);
    };

    window.addEventListener('partnerResponse', handlePartnerResponse);

    return () => {
      window.removeEventListener('partnerResponse', handlePartnerResponse);
    };
  }, []);

  // Event listener for level change requests
  useEffect(() => {
    const handleChangeLevelRequest = (event: any) => {
      setCurrentLevel(event.detail.level);
    };

    window.addEventListener('changeLevelRequest', handleChangeLevelRequest);

    return () => {
      window.removeEventListener('changeLevelRequest', handleChangeLevelRequest);
    };
  }, []);

  // Event listener for game finish
  useEffect(() => {
    const handleGameFinish = (event: any) => {
      setShowGameFinish(true);
      setGameResult(event.detail);
    };

    window.addEventListener('gameFinish', handleGameFinish);

    return () => {
      window.removeEventListener('gameFinish', handleGameFinish);
    };
  }, []);

  // Initial load: Check URL params and game state
  useEffect(() => {
    if (!roomId) {
      toast.error(t('game.missingRoomCode'));
      return;
    }

    const initialLoad = async () => {
      // Check if level is already selected in game state
      if (gameState?.current_phase === 'level-select') {
        console.log('📍 Game state is level-select - navigating to level selection');
        navigate(`/level-select?room=${roomId}`);
        return;
      }

      // If we have a card, show it immediately
      if (gameState?.current_card) {
        setCurrentCard(gameState.current_card);
        setCardIndex(gameState.current_card_index);
        setShowCard(true);
      }
    };

    initialLoad();
  }, [roomId, navigate, gameState?.current_phase, gameState?.current_card, gameState?.current_card_index, t]);

  // Level change handling
  useEffect(() => {
    const urlLevel = parseInt(searchParams.get('level') || '');

    const handleLevelChange = async () => {
      if (urlLevel) {
        // Check for level mismatch
        if (currentLevel !== null && urlLevel !== currentLevel) {
          console.warn('⚠️ Level mismatch detected:', { urlLevel, currentLevel });
          setShowLevelMismatchAlert(true);
          await syncAction('level_mismatch', { urlLevel, currentLevel });
          return;
        }

        // Set the level and fetch a new card
        console.log('🚀 Setting level from URL:', urlLevel);
        setCurrentLevel(urlLevel);
      }
    };

    handleLevelChange();
  }, [searchParams, currentLevel, syncAction]);

  // Fetch new card when level is set
  useEffect(() => {
    if (currentLevel !== null) {
      fetchNewCard();
    }
  }, [currentLevel]);

  // Sync UI with game state
  useEffect(() => {
    if (!gameState) return;

    // Sync card display
    if (gameState.current_card) {
      setCurrentCard(gameState.current_card);
      setCardIndex(gameState.current_card_index);
      setShowCard(true);
    }

    // Sync proximity question state
    setShowProximityQuestion(!gameState.proximity_question_answered);
    setShowProximityAnswer(gameState.proximity_question_answered);

    // Handle phase transitions
    if (gameState.current_phase === 'response-input') {
      setShowCard(false);
    } else if (gameState.current_phase === 'evaluation') {
      setShowCard(false);
      setShowEvaluation(true);
    } else if (gameState.current_phase === 'card-display') {
      setShowEvaluation(false);
      setShowCard(true);
    }
  }, [gameState]);

  const fetchNewCard = useCallback(async () => {
    if (!roomId || currentLevel === null) return;

    try {
      setIsCardLoading(true);
      console.log('🎯 Fetching new card - attempting AI selection first...');

      // Try AI intelligent selection first
      try {
        console.log('🤖 Calling AI question selector...');
        const { data: aiResult, error: aiError } = await supabase.functions.invoke(
          'intelligent-question-selector',
          {
            body: {
              roomId,
              currentLevel,
              language: i18n.language,
              isFirstQuestion: gameState?.used_cards?.length === 0
            }
          }
        );

        console.log('🔍 AI selector response:', { aiResult, aiError });

        if (aiError) {
          console.warn('⚠️ AI selection failed, falling back to random:', aiError);
          throw new Error(`AI selection failed: ${aiError.message}`);
        }

        if (aiResult?.question) {
          console.log('✨ AI selected question successfully:', aiResult.question.text);
          console.log('🎯 AI reasoning:', aiResult.reasoning);
          console.log('📊 Target area:', aiResult.targetArea);
          
          setAiCardInfo({
            reasoning: aiResult.reasoning,
            targetArea: aiResult.targetArea,
            selectionMethod: 'ai_intelligent'
          });

          const selectedQuestion = aiResult.question;

          // Update game state
          const newUsedCards = [...(gameState?.used_cards || []), selectedQuestion.id];
          await updateGameState({
            current_card: selectedQuestion.text,
            used_cards: newUsedCards,
            current_card_index: newUsedCards.length - 1
          });

          setCurrentCard(selectedQuestion.text);
          setCardIndex(newUsedCards.length - 1);
          console.log('🎮 Game state updated with AI-selected card');
          return;
        } else {
          console.warn('⚠️ AI response missing question, falling back to random');
          throw new Error('AI response missing question data');
        }
      } catch (aiError) {
        console.error('❌ AI selection failed:', aiError);
        console.log('🔄 Falling back to random selection...');
        
        // Clear AI info since we're falling back
        setAiCardInfo(null);
      }

      // Fallback to random selection
      console.log('🎲 Using random question selection as fallback');
      const questions = getQuestionsForLevel(currentLevel.toString(), 1);
      
      if (questions.length === 0) {
        toast.error(t('game.noQuestionsAvailable'));
        return;
      }

      const randomQuestion = questions[0];
      markQuestionAsUsed(randomQuestion.id);

      const newUsedCards = [...(gameState?.used_cards || []), randomQuestion.id];
      await updateGameState({
        current_card: randomQuestion.text,
        used_cards: newUsedCards,
        current_card_index: newUsedCards.length - 1
      });

      setCurrentCard(randomQuestion.text);
      setCardIndex(newUsedCards.length - 1);
      console.log('🎮 Game state updated with random card');

    } catch (error) {
      console.error('💥 Error fetching new card:', error);
      toast.error(t('game.errorFetchingCard'));
    } finally {
      setIsCardLoading(false);
    }
  }, [roomId, currentLevel, gameState?.used_cards, updateGameState, getQuestionsForLevel, markQuestionAsUsed, t, i18n.language]);

  const handleProximityAnswer = async (answer: boolean) => {
    await updateGameState({ proximity_question_answered: true, proximity_response: answer });
    await syncAction('proximity_answer', { answer });
    setShowProximityQuestion(false);
    setShowProximityAnswer(true);
  };

  const handleCardReveal = async () => {
    setShowCard(true);
    await syncAction('card_reveal', {});
  };

  const handleResponseSubmit = async (response: string, responseTime: number, question: string, from: string) => {
    await updateGameState({ current_phase: 'evaluation' });
    await syncAction('response_submit', { response, responseTime, question, from });
    setShowCard(false);
  };

  const handleEvaluationSubmit = async (scores: any) => {
    setEvaluationScores(scores);
    setShowEvaluation(false);

    const nextCard = true; // For now, always request next card
    await syncAction('evaluation_submit', { scores, nextCard });

    // Fetch the next card
    await fetchNewCard();
    await updateGameState({ current_phase: 'card-display' });
  };

  const handleGameFinish = async (result: any) => {
    setShowGameFinish(true);
    setGameResult(result);
    await syncAction('game_finish', result);
  };

  const handleNavigateToLevelSelect = async () => {
    await syncAction('navigate_to_level_select', {});
    navigate(`/level-select?room=${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          {t('game.title')}
        </h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleNavigateToLevelSelect}>
            {t('game.changeLevel')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t('game.endGame')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('game.endGameConfirmation')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('game.endGameWarning')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('game.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleGameFinish({
                  winner: 'no one',
                  reason: 'game ended early'
                })}>{t('game.confirm')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">{t('game.loading')}</p>
        </div>
      )}

      {showLevelMismatchAlert && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">{t('game.levelMismatchTitle')}</h2>
            <p className="text-gray-700 mb-4">{t('game.levelMismatchDescription')}</p>
            <Button onClick={() => setShowLevelMismatchAlert(false)}>{t('game.ok')}</Button>
          </div>
        </div>
      )}

      {showProximityQuestion && (
        <ProximityQuestion onAnswer={handleProximityAnswer} />
      )}

      {showProximityAnswer && (
        <ProximityAnswer proximityResponse={gameState?.proximity_response} />
      )}

      {currentPhase === 'card-display' && (
        <GameCard 
          currentCard={currentCard}
          currentLevel={currentLevel}
          showCard={showCard}
          cardIndex={cardIndex}
          totalCards={cardIndex + 1}
          aiReasoning={aiCardInfo?.reasoning}
          aiTargetArea={aiCardInfo?.targetArea}
          selectionMethod={aiCardInfo?.selectionMethod}
        />
      )}

      {currentPhase === 'card-display' && !showCard && (
        <div className="flex-1 flex items-center justify-center">
          <Button onClick={handleCardReveal} disabled={isCardLoading}>
            {isCardLoading ? t('game.loading') : t('game.revealCard')}
          </Button>
        </div>
      )}

      {currentPhase === 'response-input' && currentCard && (
        <ResponseInput
          cardText={currentCard}
          onResponseSubmit={handleResponseSubmit}
          partnerResponse={partnerResponse}
        />
      )}

      {showEvaluation && (
        <Evaluation
          cardText={currentCard}
          partnerResponse={partnerResponse}
          onEvaluationSubmit={handleEvaluationSubmit}
        />
      )}

      {showGameFinish && (
        <GameFinish
          gameResult={gameResult}
        />
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { GameCard } from '@/components/game/GameCard';
import { ResponseInput } from '@/components/game/ResponseInput';
import { ResponseEvaluation } from '@/components/game/ResponseEvaluation';
import { WaitingRoom } from '@/components/game/WaitingRoom';
import { ConnectionReport } from '@/components/game/ConnectionReport';
import { GetCloseAnalysis } from '@/components/game/GetCloseAnalysis';
import { LevelUpConfirmation } from '@/components/game/LevelUpConfirmation';
import { useGameSync } from '@/hooks/useGameSync';
import { useQuestions } from '@/hooks/useQuestions';
import { usePlayerId } from '@/hooks/usePlayerId';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Heart } from 'lucide-react';

const Game = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('room');
  const currentLevel = parseInt(searchParams.get('level') || '1');
  const playerId = usePlayerId();

  console.log('🌍 useGameSync language:', i18n.language);

  // Game state
  const {
    room,
    gameState,
    participants,
    playerNumber,
    isMyTurn,
    gamePhase,
    connectionReport,
    analysisData,
    levelUpData
  } = useGameSync(roomCode, playerId, currentLevel);

  console.log('🎮 Game component initialized:', {
    roomCode,
    currentLevel,
    room,
    gamePhase,
    playerId,
    playerNumber
  });

  const [currentCard, setCurrentCard] = useState<string>('');
  const [aiCardInfo, setAiCardInfo] = useState<{
    reasoning?: string;
    targetArea?: string;
    selectionMethod?: string;
  } | null>(null);
  const [response, setResponse] = useState('');
  const [evaluation, setEvaluation] = useState({
    honesty: 0,
    attraction: 0,
    intimacy: 0,
    surprise: 0
  });

  // Load questions for the current level
  const { questions, levelData } = useQuestions(currentLevel, i18n.language);

  console.log('🎯 Turn logic:', {
    currentTurn: gameState?.current_turn,
    playerNumber,
    isMyTurn,
    gamePhase
  });

  // Get next question with AI assistance
  const getNextQuestion = async () => {
    if (!room || !questions.length || !levelData) {
      console.log('⚠️ Missing requirements for question selection:', { room, questionsCount: questions.length, levelData });
      return;
    }

    try {
      console.log('🤖 Attempting AI question selection with:', {
        levelId: levelData.id,
        language: i18n.language,
        usedCards: gameState?.used_cards || []
      });

      // Try AI-powered question selection first
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        'intelligent-question-selector',
        {
          body: {
            level_id: levelData.id,
            language: i18n.language,
            used_cards: gameState?.used_cards || [],
            room_id: room
          }
        }
      );

      console.log('🤖 AI Selection Result:', { aiResult, aiError });

      if (aiResult?.question && !aiError) {
        console.log('✨ AI selected question:', aiResult.question);
        setCurrentCard(aiResult.question);
        setAiCardInfo({
          reasoning: aiResult.reasoning,
          targetArea: aiResult.target_area,
          selectionMethod: 'ai_intelligent'
        });
        await updateGameState(aiResult.question);
      } else {
        console.log('🎲 Falling back to random selection due to AI error:', aiError);
        // Fallback to random selection
        const availableQuestions = questions.filter(q => 
          !gameState?.used_cards?.includes(q.text)
        );
        
        if (availableQuestions.length > 0) {
          const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
          console.log('🎲 Random selected question:', randomQuestion.text);
          setCurrentCard(randomQuestion.text);
          setAiCardInfo({
            selectionMethod: 'random'
          });
          await updateGameState(randomQuestion.text);
        }
      }
    } catch (error) {
      console.error('❌ Error selecting question:', error);
      // Ultimate fallback
      if (questions.length > 0) {
        const fallbackQuestion = questions[0];
        console.log('🆘 Using fallback question:', fallbackQuestion.text);
        setCurrentCard(fallbackQuestion.text);
        setAiCardInfo({
          selectionMethod: 'fallback'
        });
        await updateGameState(fallbackQuestion.text);
      }
    }
  };

  const updateGameState = async (questionText: string) => {
    if (!room) return;

    const usedCards = gameState?.used_cards || [];
    const newUsedCards = [...usedCards, questionText];

    const { error } = await supabase
      .from('game_rooms')
      .update({
        current_card: questionText,
        used_cards: newUsedCards,
        current_card_index: (gameState?.current_card_index || 0) + 1
      })
      .eq('id', room);

    if (error) {
      console.error('Error updating game state:', error);
    }
  };

  // Sync current card from game state
  useEffect(() => {
    if (gameState?.current_card && gameState.current_card !== currentCard) {
      console.log('📄 Card updated from game state:', gameState.current_card);
      setCurrentCard(gameState.current_card);
    }
  }, [gameState?.current_card]);

  // Load first card when game starts
  useEffect(() => {
    if (gamePhase === 'card-display' && !currentCard && questions.length > 0 && isMyTurn) {
      console.log('🚀 Loading first card for game start');
      getNextQuestion();
    }
  }, [gamePhase, currentCard, questions.length, isMyTurn]);

  // Handle response submission
  const handleResponseSubmit = async () => {
    if (!room || !response.trim()) return;

    console.log('📝 Submitting response:', response);

    try {
      const { error } = await supabase
        .from('game_responses')
        .insert({
          room_id: room,
          player_id: playerId,
          question: currentCard,
          response: response.trim(),
          player_number: playerNumber
        });

      if (error) throw error;

      // Update game state to evaluation phase
      await supabase
        .from('game_rooms')
        .update({
          current_phase: 'evaluation',
          current_turn: playerNumber === 1 ? 'player2' : 'player1'
        })
        .eq('id', room);

      setResponse('');
      toast.success(t('messages.responseSubmitted'));
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error(t('game.errors.responseSaveFailed'));
    }
  };

  // Handle evaluation submission
  const handleEvaluationSubmit = async () => {
    if (!room) return;

    console.log('⭐ Submitting evaluation:', evaluation);

    try {
      const { error } = await supabase
        .from('game_evaluations')
        .insert({
          room_id: room,
          evaluator_id: playerId,
          question: currentCard,
          honesty: evaluation.honesty,
          attraction: evaluation.attraction,
          intimacy: evaluation.intimacy,
          surprise: evaluation.surprise,
          evaluator_number: playerNumber
        });

      if (error) throw error;

      // Reset evaluation
      setEvaluation({
        honesty: 0,
        attraction: 0,
        intimacy: 0,
        surprise: 0
      });

      // Move to next card
      await getNextQuestion();
      
      // Update game state back to card display
      await supabase
        .from('game_rooms')
        .update({
          current_phase: 'card-display',
          current_turn: 'player1' // Reset to player 1 for next card
        })
        .eq('id', room);

      toast.success(t('messages.evaluationSubmitted'));
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error(t('game.errors.evaluationSaveFailed'));
    }
  };

  const handleLevelChange = async () => {
    if (!room) return;
    
    navigate(`/level-select?room=${roomCode}`);
  };

  const handleFinishGame = async () => {
    if (!room) return;

    try {
      await supabase
        .from('game_rooms')
        .update({ 
          status: 'completed',
          current_phase: 'final-report'
        })
        .eq('id', room);
    } catch (error) {
      console.error('Error finishing game:', error);
    }
  };

  // Early returns for loading states
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-lg font-medium text-muted-foreground">
              {roomCode ? t('game.connectingToRoom') : t('game.noRoomCode')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show connection report if game is completed
  if (gameState?.current_phase === 'final-report' || connectionReport) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <ConnectionReport 
          report={connectionReport}
          analysisData={analysisData}
          onNewGame={() => navigate('/')}
          onBackHome={() => navigate('/')}
        />
      </div>
    );
  }

  // Show level up confirmation when needed
  if (levelUpData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <LevelUpConfirmation
          currentLevel={currentLevel}
          levelUpData={levelUpData}
          onConfirm={handleLevelChange}
          onBackHome={() => navigate('/')}
        />
      </div>
    );
  }

  // Show waiting room if not enough players
  if (participants.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <WaitingRoom 
          roomCode={roomCode!}
          participants={participants}
          onLeaveRoom={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('button.back_home')}
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {roomCode}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              {t('game.level')} {currentLevel}
            </Badge>
          </div>
        </div>

        {/* Game Content */}
        <div className="space-y-6">
          {gamePhase === 'card-display' && currentCard && (
            <GameCard
              question={currentCard}
              aiCardInfo={aiCardInfo}
              level={currentLevel}
              onLevelChange={handleLevelChange}
              onFinish={handleFinishGame}
            />
          )}

          {gamePhase === 'response' && isMyTurn && (
            <ResponseInput
              question={currentCard}
              response={response}
              onResponseChange={setResponse}
              onSubmit={handleResponseSubmit}
              isSubmitting={false}
              gameMode={gameState?.proximity_response ? 'together' : 'apart'}
            />
          )}

          {gamePhase === 'evaluation' && isMyTurn && (
            <ResponseEvaluation
              question={currentCard}
              response={""} // You'll need to fetch the actual response
              evaluation={evaluation}
              onEvaluationChange={setEvaluation}
              onSubmit={handleEvaluationSubmit}
              isSubmitting={false}
              evaluatingPlayer={playerNumber === 1 ? 2 : 1}
            />
          )}

          {/* Waiting state */}
          {!isMyTurn && (
            <Card className="w-full">
              <CardContent className="p-8 text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  {t('game.waitingForResponse', { 
                    player: playerNumber === 1 ? t('game.player2') : t('game.player1') 
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('game.safetyNote')}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;

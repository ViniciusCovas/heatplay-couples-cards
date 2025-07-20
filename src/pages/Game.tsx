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
import { useRoomService } from '@/hooks/useRoomService';
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

  // Game state from hooks
  const { gameState, syncAction, updateGameState, isLoading } = useGameSync(roomCode, playerId);
  const { questions, levels, getQuestionsForLevel } = useQuestions();
  const { room, participants, isConnected, playerNumber, joinRoom, leaveRoom } = useRoomService();

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

  // Get next question with AI assistance
  const getNextQuestion = async () => {
    if (!roomCode || !questions.length) {
      console.log('⚠️ Missing requirements for question selection');
      return;
    }

    try {
      // Get level data for the current level
      const levelData = levels.find(l => l.sort_order === currentLevel);
      if (!levelData) {
        console.log('⚠️ Level data not found for level:', currentLevel);
        // Fallback to random selection
        const availableQuestions = getQuestionsForLevel(currentLevel.toString(), 1);
        if (availableQuestions.length > 0) {
          setCurrentCard(availableQuestions[0].text);
          console.log('📝 Using fallback random question');
        }
        return;
      }

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
            room_id: roomCode
          }
        }
      );

      console.log('🤖 AI selection result:', { aiResult, aiError });

      if (aiResult && !aiError && aiResult.question) {
        console.log('✅ AI selection successful! Question:', aiResult.question);
        setCurrentCard(aiResult.question);
        setAiCardInfo({
          reasoning: aiResult.ai_reasoning || '',
          targetArea: aiResult.target_area || '',
          selectionMethod: 'ai_intelligent'
        });
        console.log('🎯 AI badge info set:', {
          reasoning: aiResult.ai_reasoning,
          targetArea: aiResult.target_area,
          selectionMethod: 'ai_intelligent'
        });
        
        // Update game state with AI-selected card
        await updateGameState({
          current_card: aiResult.question,
          used_cards: [...(gameState?.used_cards || []), aiResult.question]
        });
        return;
      }

      console.log('⚠️ AI selection failed, falling back to random');
      // Fallback to random selection
      const availableQuestions = getQuestionsForLevel(currentLevel.toString(), 1);
      if (availableQuestions.length > 0) {
        const selectedQuestion = availableQuestions[0].text;
        setCurrentCard(selectedQuestion);
        setAiCardInfo(null); // Clear AI info for random selection
        console.log('📝 Using random fallback question');
        
        await updateGameState({
          current_card: selectedQuestion,
          used_cards: [...(gameState?.used_cards || []), selectedQuestion]
        });
      }
    } catch (error) {
      console.error('❌ Error in question selection:', error);
      // Final fallback
      const availableQuestions = getQuestionsForLevel(currentLevel.toString(), 1);
      if (availableQuestions.length > 0) {
        setCurrentCard(availableQuestions[0].text);
        setAiCardInfo(null);
      }
    }
  };

  // Submit response
  const handleSubmitResponse = async () => {
    if (!response.trim() || !roomCode) return;

    try {
      // Save response to database
      const { error } = await supabase
        .from('game_responses')
        .insert({
          player_id: playerId,
          room_id: roomCode,
          card_id: currentCard,
          response: response.trim(),
          round_number: gameState?.current_card_index || 0,
          selection_method: aiCardInfo?.selectionMethod || 'random',
          ai_reasoning: aiCardInfo?.reasoning
        });

      if (error) throw error;

      // Sync action to notify other player
      await syncAction('response_submit', {
        response: response.trim(),
        question: currentCard,
        from: playerId
      });

      // Update game phase to evaluation
      await updateGameState({
        current_phase: 'evaluation'
      });

      toast.success(t('game.responseSubmitted'));
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error(t('game.submitError'));
    }
  };

  // Submit evaluation
  const handleSubmitEvaluation = async () => {
    if (!roomCode) return;

    try {
      // Save evaluation
      const { error } = await supabase
        .from('game_responses')
        .update({
          evaluation: `honesty:${evaluation.honesty},attraction:${evaluation.attraction},intimacy:${evaluation.intimacy},surprise:${evaluation.surprise}`,
          evaluation_by: playerId
        })
        .eq('room_id', roomCode)
        .eq('card_id', currentCard);

      if (error) throw error;

      await syncAction('evaluation_submit', {
        evaluation,
        nextCard: true
      });

      // Move to next card
      await getNextQuestion();
      await updateGameState({
        current_phase: 'card-display',
        current_card_index: (gameState?.current_card_index || 0) + 1
      });

      setResponse('');
      setEvaluation({ honesty: 0, attraction: 0, intimacy: 0, surprise: 0 });
      toast.success(t('game.evaluationSubmitted'));
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error(t('game.submitError'));
    }
  };

  // Join room on component mount
  useEffect(() => {
    if (roomCode && !isConnected) {
      joinRoom(roomCode);
    }
  }, [roomCode, isConnected, joinRoom]);

  // Get initial question when game starts
  useEffect(() => {
    if (gameState?.current_phase === 'card-display' && !currentCard) {
      getNextQuestion();
    }
  }, [gameState?.current_phase, currentCard]);

  const handleBackHome = () => {
    leaveRoom();
    navigate('/');
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  const handleGameStart = async () => {
    await updateGameState({
      current_phase: 'card-display'
    });
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">{t('game.roomNotFound')}</h2>
            <Button onClick={handleBackHome} className="w-full">
              {t('common.backHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackHome}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.backHome')}
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              {roomCode}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              {t('levels.level')} {currentLevel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {gameState?.current_phase === 'proximity-selection' && (
          <WaitingRoom
            roomCode={roomCode}
            participants={participants}
            onLeaveRoom={handleLeaveRoom}
            onGameStart={handleGameStart}
          />
        )}

        {gameState?.current_phase === 'card-display' && currentCard && (
          <GameCard
            currentCard={currentCard}
            currentLevel={currentLevel}
            showCard={true}
            cardIndex={gameState?.current_card_index || 0}
            totalCards={10}
            aiReasoning={aiCardInfo?.reasoning}
            aiTargetArea={aiCardInfo?.targetArea}
            selectionMethod={aiCardInfo?.selectionMethod}
          />
        )}

        {gameState?.current_phase === 'response-input' && (
          <ResponseInput
            isVisible={true}
            question={currentCard}
            onSubmitResponse={(response, responseTime) => {
              setResponse(response);
              handleSubmitResponse();
            }}
            isSubmitting={isLoading}
          />
        )}

        {gameState?.current_phase === 'evaluation' && (
          <ResponseEvaluation
            isVisible={true}
            question={currentCard}
            response={response}
            playerName={t('game.you')}
            onSubmitEvaluation={(evaluationData) => {
              setEvaluation(evaluationData);
              handleSubmitEvaluation();
            }}
            onCancel={() => {
              navigate('/');
            }}
            isSubmitting={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default Game;
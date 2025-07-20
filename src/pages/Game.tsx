import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { GameCard } from "@/components/game/GameCard";
import { ProximitySelector } from "@/components/game/ProximitySelector";
import { ResponseInput } from "@/components/game/ResponseInput";
import { ResponseEvaluation } from "@/components/game/ResponseEvaluation";
import { ConnectionReport } from "@/components/game/ConnectionReport";
import { LevelUpConfirmation } from "@/components/game/LevelUpConfirmation";
import { WaitingRoom } from "@/components/game/WaitingRoom";
import { useGameSync } from "@/hooks/useGameSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home } from "lucide-react";

interface Question {
  id: string;
  text: string;
  category: string;
}

interface GameResponse {
  id: string;
  player_id: string;
  card_id: string;
  response: string;
  evaluation: string | null;
  round_number: number;
  created_at: string;
}

interface AIInsight {
  reasoning?: string;
  targetArea?: string;
  selectionMethod?: string;
}

const Game = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const roomCode = searchParams.get("room");
  const levelParam = searchParams.get("level");
  
  const [roomId, setRoomId] = useState<string>("");
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentLevelUuid, setCurrentLevelUuid] = useState<string>("");
  const [playerId] = useState(`player_${Math.random().toString(36).substr(2, 9)}`);
  const [gamePhase, setGamePhase] = useState<"waiting" | "proximity" | "level-select" | "playing" | "finished">("waiting");
  const [currentCard, setCurrentCard] = useState<Question | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [proximity, setProximity] = useState<boolean | null>(null);
  const [currentTurn, setCurrentTurn] = useState<"player1" | "player2">("player1");
  const [showCard, setShowCard] = useState(true);
  const [gameResponses, setGameResponses] = useState<GameResponse[]>([]);
  const [pendingEvaluation, setPendingEvaluation] = useState<GameResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionReport, setConnectionReport] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight>({});

  const { gameState, syncAction } = useGameSync(roomId, playerId);

  // Handle game sync events via custom events
  useEffect(() => {
    const handlePartnerResponse = (event: CustomEvent) => {
      const { response, responseTime, question, from } = event.detail;
      console.log("🔄 Partner response received:", { response, responseTime, question, from });
      // Handle partner response
    };

    const handleGameFinish = (event: CustomEvent) => {
      setConnectionReport(event.detail);
      setGamePhase("finished");
    };

    window.addEventListener('partnerResponse', handlePartnerResponse as EventListener);
    window.addEventListener('gameFinish', handleGameFinish as EventListener);

    return () => {
      window.removeEventListener('partnerResponse', handlePartnerResponse as EventListener);
      window.removeEventListener('gameFinish', handleGameFinish as EventListener);
    };
  }, []);

  // Fetch level UUID when component mounts or level changes
  useEffect(() => {
    const fetchLevelData = async () => {
      if (!levelParam) return;
      
      try {
        const { data: levels, error } = await supabase
          .from('levels')
          .select('id, name, sort_order')
          .eq('sort_order', parseInt(levelParam))
          .eq('language', 'en')
          .single();
          
        if (error) {
          console.error('Error fetching level data:', error);
          return;
        }
        
        if (levels) {
          setCurrentLevelUuid(levels.id);
          console.log('📊 Level UUID set:', levels.id, 'for sort order:', levelParam);
        }
      } catch (error) {
        console.error('Error in fetchLevelData:', error);
      }
    };
    
    fetchLevelData();
  }, [levelParam]);

  useEffect(() => {
    if (roomCode) {
      setRoomId(roomCode);
    }
  }, [roomCode]);

  useEffect(() => {
    if (levelParam) {
      setCurrentLevel(parseInt(levelParam));
    }
  }, [levelParam]);

  useEffect(() => {
    const subscribeToGameRoom = async () => {
      if (!roomId) return;

      await supabase
        .channel(`game_room:${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_rooms' },
          async (payload) => {
            console.log('✅ Change received!', payload)
            const room = payload.new;

            // Handle room updates if needed
            if (room && typeof room === 'object') {
              // Update based on room status changes
              console.log('Room updated:', room);
            }
          }
        )
        .subscribe()
    }

    subscribeToGameRoom();
  }, [roomId, supabase]);

  const getNextCard = async () => {
    if (!roomId || !currentLevelUuid) {
      console.error("❌ Missing roomId or currentLevelUuid for question selection");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("🎯 Getting next card with AI selection...");

      // Determine if this is the first question
      const isFirstQuestion = gameResponses.length === 0;
      
      console.log("🤖 Calling AI question selector:", {
        roomId,
        currentLevel: currentLevelUuid,
        language: 'en',
        isFirstQuestion
      });

      // Always try AI selection first
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        'intelligent-question-selector',
        {
          body: {
            roomId,
            currentLevel: currentLevelUuid,
            language: 'en',
            isFirstQuestion
          }
        }
      );

      let selectedQuestion: Question;
      let aiInsightData: AIInsight = {};

      if (aiError || !aiResult || aiResult.error) {
        console.warn("⚠️ AI selection failed, falling back to random:", aiError || aiResult?.error);
        
        // Fallback to random selection
        const { data: questions, error: questionsError } = await supabase
          .rpc('get_random_questions_for_level', {
            level_id_param: currentLevelUuid,
            language_param: 'en',
            limit_param: 1
          });

        if (questionsError || !questions || questions.length === 0) {
          throw new Error('No questions available');
        }

        selectedQuestion = questions[0];
        aiInsightData = { selectionMethod: 'random' };
      } else {
        console.log("✅ AI selection successful:", aiResult);
        selectedQuestion = aiResult.question;
        aiInsightData = {
          reasoning: aiResult.reasoning,
          targetArea: aiResult.targetArea,
          selectionMethod: aiResult.selectionMethod || 'ai_intelligent'
        };
      }

      // Update room with new card
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          current_card: selectedQuestion.text,
          current_card_index: cardIndex,
          used_cards: [...(await getCurrentUsedCards()), selectedQuestion.id]
        })
        .eq('id', roomId);

      if (updateError) {
        throw updateError;
      }

      // Sync with other player
      await supabase
        .from('game_sync')
        .insert({
          room_id: roomId,
          action_type: 'card_revealed',
          triggered_by: playerId,
          action_data: {
            card: selectedQuestion,
            cardIndex: cardIndex,
            totalCards: totalCards,
            aiInsight: aiInsightData
          } as any
        });

      setCurrentCard(selectedQuestion);
      setAiInsight(aiInsightData);
      setShowCard(true);

    } catch (error) {
      console.error("❌ Error getting next card:", error);
      toast({
        title: t("errors.generic"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getCurrentUsedCards = async () => {
    try {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('used_cards')
        .eq('id', roomId)
        .single();
      
      return room?.used_cards || [];
    } catch (error) {
      console.error('Error fetching used cards:', error);
      return [];
    }
  };
  
  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">{t("game.errors.connectionError")}</h1>
          <p className="text-gray-600">{t("game.noRoomCode")}</p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" />
            {t("common.backToHome")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {gamePhase === "waiting" && (
          <WaitingRoom
            roomCode={roomCode}
            participants={[]}
            onGameStart={async () => setGamePhase("proximity")}
            onLeaveRoom={() => navigate("/")}
          />
        )}

        {gamePhase === "proximity" && (
          <ProximitySelector
            isVisible={true}
            onSelect={(isClose) => {
              setProximity(isClose);
              setGamePhase("playing");
            }}
            roomCode={roomCode}
            room={null}
          />
        )}

        {gamePhase === "playing" && currentCard && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">
                {t("game.levelTitle", { level: currentLevel, name: t(`levels.level${currentLevel}Name`) })}
              </h2>
              <p className="text-gray-600">
                {t("game.cardsCompleted", { completed: cardIndex, total: totalCards })}
              </p>
            </div>

            <GameCard
              currentCard={currentCard.text}
              currentLevel={currentLevel}
              showCard={showCard}
              cardIndex={cardIndex}
              totalCards={totalCards}
              aiReasoning={aiInsight.reasoning}
              aiTargetArea={aiInsight.targetArea}
              selectionMethod={aiInsight.selectionMethod}
            />

            {proximity && (
              <ResponseInput
                isVisible={true}
                question={currentCard.text}
                onSubmitResponse={(response: string, responseTime: number) => {
                  console.log('Response submitted:', { response, responseTime });
                }}
                isSubmitting={isSubmitting}
              />
            )}

            {!proximity && (
              <div className="text-center space-y-4">
                <p className="text-lg text-gray-700">{t("game.spokenModeDescription")}</p>
                <Button
                  onClick={getNextCard}
                  disabled={isSubmitting}
                  size="lg"
                  className="px-8"
                >
                  {isSubmitting ? t("game.submitting") : t("buttons.continue")}
                </Button>
              </div>
            )}
          </div>
        )}

        {pendingEvaluation && (
          <ResponseEvaluation
            isVisible={true}
            question={currentCard?.text || ''}
            response={pendingEvaluation.response || ''}
            playerName="Player"
            onSubmitEvaluation={(evaluation) => {
              console.log('Evaluation submitted:', evaluation);
            }}
            onCancel={() => setPendingEvaluation(null)}
          />
        )}

        {connectionReport && (
          <ConnectionReport
            isVisible={true}
            connectionData={connectionReport}
            onPlayAgain={() => navigate("/")}
            onGoHome={() => navigate("/")}
          />
        )}
      </div>
    </div>
  );
};

export default Game;

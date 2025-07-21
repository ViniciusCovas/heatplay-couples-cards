
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for level lookups
const levelCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 10000; // 10 seconds

// Utility function for exponential backoff delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempt: number = 1,
  context: string = ''
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES} for ${context}:`, error.message);
    
    if (attempt >= MAX_RETRIES) {
      console.error(`❌ Max retries exceeded for ${context}:`, error);
      throw error;
    }

    // Handle specific OpenAI rate limit errors
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      const waitTime = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
      console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
    } else {
      // Standard exponential backoff for other errors
      const waitTime = Math.min(BASE_DELAY * Math.pow(1.5, attempt - 1), MAX_DELAY);
      await delay(waitTime);
    }

    return retryWithBackoff(fn, attempt + 1, context);
  }
}

// Cached level lookup function
async function getCachedLevelId(supabase: any, currentLevel: number, language: string): Promise<string> {
  const cacheKey = `${currentLevel}-${language}`;
  const cached = levelCache.get(cacheKey);
  
  // Return cached result if valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📋 Using cached level ID for ${cacheKey}:`, cached.id);
    return cached.id;
  }

  // Fetch from database with retry
  const levelData = await retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('levels')
      .select('id')
      .eq('sort_order', currentLevel)
      .eq('language', language)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error(`Level lookup failed: ${error.message}`);
    }
    if (!data) {
      throw new Error(`No level found for sort_order ${currentLevel} and language ${language}`);
    }
    
    return data;
  }, 1, `level lookup (${cacheKey})`);

  // Cache the result
  levelCache.set(cacheKey, { id: levelData.id, timestamp: Date.now() });
  console.log(`💾 Cached level ID for ${cacheKey}:`, levelData.id);
  
  return levelData.id;
}

// Enhanced OpenAI API call with better error handling
async function callOpenAIWithRetry(promptContent: string): Promise<any> {
  return retryWithBackoff(async () => {
    console.log('🤖 Calling OpenAI API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Reduced to 25 seconds

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14', // Updated to latest model
          messages: [{ role: 'user', content: promptContent }],
          temperature: 0.7,
          max_tokens: 200, // Reduced from 300 for faster response
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(`OpenAI rate limit (429): ${errorText}`);
        } else if (response.status >= 500) {
          throw new Error(`OpenAI server error (${response.status}): ${errorText}`);
        } else {
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ OpenAI API call successful');
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API call timed out after 25 seconds');
      }
      throw error;
    }
  }, 1, 'OpenAI API call');
}

// Smart fallback function that considers context
function getSmartRandomFallback(availableQuestions: any[], lastTurnAnalysis: any, isFirstQuestion: boolean): any {
  console.log('🎲 Using smart random fallback with context');
  
  if (isFirstQuestion) {
    // For first questions, prefer general or introductory questions
    const introQuestions = availableQuestions.filter(q => 
      q.category && (q.category.includes('general') || q.category.includes('intro'))
    );
    if (introQuestions.length > 0) {
      return introQuestions[Math.floor(Math.random() * introQuestions.length)];
    }
  }

  // If we have last turn analysis, try to balance areas
  if (lastTurnAnalysis && lastTurnAnalysis.count > 0) {
    const avgHonesty = lastTurnAnalysis.honesty / lastTurnAnalysis.count;
    const avgAttraction = lastTurnAnalysis.attraction / lastTurnAnalysis.count;
    const avgIntimacy = lastTurnAnalysis.intimacy / lastTurnAnalysis.count;
    const avgSurprise = lastTurnAnalysis.surprise / lastTurnAnalysis.count;
    
    // Find the lowest scoring area
    const scores = [
      { area: 'honesty', score: avgHonesty },
      { area: 'attraction', score: avgAttraction },
      { area: 'intimacy', score: avgIntimacy },
      { area: 'surprise', score: avgSurprise }
    ];
    
    const lowestArea = scores.reduce((min, current) => current.score < min.score ? current : min);
    console.log(`🎯 Targeting lowest area: ${lowestArea.area} (score: ${lowestArea.score})`);
    
    // Try to find questions that might improve this area
    const targetQuestions = availableQuestions.filter(q => 
      q.category && q.category.toLowerCase().includes(lowestArea.area.toLowerCase())
    );
    
    if (targetQuestions.length > 0) {
      return targetQuestions[Math.floor(Math.random() * targetQuestions.length)];
    }
  }

  // Default random selection
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let failureReason = '';

  try {
    const { roomId, currentLevel, language = 'en', isFirstQuestion = false } = await req.json();

    console.log('🧠 AI Question Selector called:', { 
      roomId, 
      currentLevel, 
      language, 
      isFirstQuestion,
      timestamp: new Date().toISOString()
    });

    // Validate OpenAI API key
    if (!openAIApiKey) {
      failureReason = 'OpenAI API key not configured in environment';
      console.error('❌ OpenAI API key not configured');
      throw new Error(failureReason);
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Parallel data fetching with individual error handling
    const [lastTurnResponses, room, levelId] = await Promise.allSettled([
      // Get only the LAST TURN responses (most recent 2 responses)
      retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('game_responses')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })
          .limit(2); // Only get last 2 responses (one from each player)

        if (error) throw new Error(`Failed to fetch recent game responses: ${error.message}`);
        return data || [];
      }, 1, 'last turn responses fetch'),

      // Get room data
      retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('used_cards')
          .eq('id', roomId)
          .single();

        if (error) throw new Error(`Failed to fetch room data: ${error.message}`);
        return data;
      }, 1, 'room data fetch'),

      // Get level ID with caching
      getCachedLevelId(supabase, currentLevel, language)
    ]);

    // Handle individual failures
    if (lastTurnResponses.status === 'rejected') {
      failureReason = `Database error: ${lastTurnResponses.reason.message}`;
      throw lastTurnResponses.reason;
    }
    if (room.status === 'rejected') {
      failureReason = `Room fetch error: ${room.reason.message}`;
      throw room.reason;
    }
    if (levelId.status === 'rejected') {
      failureReason = `Level lookup error: ${levelId.reason.message}`;
      throw levelId.reason;
    }

    const lastTurnResponseData = lastTurnResponses.value;
    const roomData = room.value;
    const levelIdValue = levelId.value;

    // Get available questions with metadata
    const questions = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, category, intensity, question_type')
        .eq('level_id', levelIdValue)
        .eq('language', language)
        .eq('is_active', true);

      if (error) throw new Error(`Failed to fetch questions: ${error.message}`);
      return data || [];
    }, 1, 'questions fetch');

    // Filter out already used questions (compare by ID, not text)
    const usedCards = roomData.used_cards || [];
    const availableQuestions = questions.filter((q: any) => !usedCards.includes(q.id));

    if (availableQuestions.length === 0) {
      failureReason = 'No available questions for this level and language';
      console.warn('⚠️ No available questions for this level');
      throw new Error(failureReason);
    }

    console.log('📊 Data fetched successfully:', {
      availableQuestions: availableQuestions.length,
      usedCards: usedCards.length,
      lastTurnResponses: lastTurnResponseData.length
    });

    // Analyze ONLY the last turn responses for patterns
    const lastTurnAnalysis = lastTurnResponseData.reduce((acc: any, response: any) => {
      if (response.evaluation) {
        try {
          const evaluation = JSON.parse(response.evaluation);
          acc.honesty = (acc.honesty || 0) + (evaluation.honesty || 0);
          acc.attraction = (acc.attraction || 0) + (evaluation.attraction || 0);
          acc.intimacy = (acc.intimacy || 0) + (evaluation.intimacy || 0);
          acc.surprise = (acc.surprise || 0) + (evaluation.surprise || 0);
          acc.count++;
          acc.responses.push({
            player: response.player_id,
            response: response.response?.substring(0, 100) + '...',
            evaluation: evaluation
          });
        } catch (e) {
          console.warn('⚠️ Failed to parse evaluation:', e);
        }
      }
      return acc;
    }, { count: 0, responses: [] });

    console.log('📈 Last turn analysis:', lastTurnAnalysis);

    // Streamlined prompt focusing ONLY on the last turn
    const promptContent = `You are GetClose AI, an expert relationship coach helping couples connect deeper through strategic question selection.

CURRENT CONTEXT:
- Relationship Level: ${currentLevel}
- Language: ${language}
- Is First Question: ${isFirstQuestion}
- Available Questions: ${availableQuestions.length}

${isFirstQuestion ? 'FIRST QUESTION - Set a welcoming, engaging tone that invites vulnerability.' : 
`LAST TURN ANALYSIS:
${lastTurnAnalysis.count > 0 ? 
`Recent Responses (${lastTurnAnalysis.count}):
${lastTurnAnalysis.responses.map((r: any, i: number) => 
  `${i+1}. ${r.player}: "${r.response}"
     Scores - Honesty: ${r.evaluation.honesty}, Attraction: ${r.evaluation.attraction}, Intimacy: ${r.evaluation.intimacy}, Surprise: ${r.evaluation.surprise}`
).join('\n')}

Average Scores: H:${(lastTurnAnalysis.honesty/lastTurnAnalysis.count).toFixed(1)} A:${(lastTurnAnalysis.attraction/lastTurnAnalysis.count).toFixed(1)} I:${(lastTurnAnalysis.intimacy/lastTurnAnalysis.count).toFixed(1)} S:${(lastTurnAnalysis.surprise/lastTurnAnalysis.count).toFixed(1)}` 
: 'No recent evaluations available'}`}

STRATEGY: ${isFirstQuestion ? 'Create foundation for connection' : 'Build on the immediate emotional state from the last responses'}

AVAILABLE QUESTIONS:
${availableQuestions.slice(0, 15).map((q: any, i: number) => `${i + 1}. [${q.category || 'general'}] ${q.text}`).join('\n')}

Select the BEST question for RIGHT NOW. Focus on the immediate emotional context.

Respond with ONLY:
{
  "selectedQuestionIndex": [0-based index],
  "reasoning": "[2 sentences max]",
  "targetArea": "[honesty|attraction|intimacy|surprise]"
}`;

    // Call OpenAI with enhanced error handling
    let aiResponse;
    try {
      const data = await callOpenAIWithRetry(promptContent);
      
      try {
        aiResponse = JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        failureReason = `AI returned invalid JSON format: ${data.choices[0].message.content}`;
        console.error('❌ Failed to parse OpenAI response:', data.choices[0].message.content);
        throw new Error(failureReason);
      }
    } catch (apiError) {
      failureReason = `OpenAI API failed: ${apiError.message}`;
      console.error('❌ OpenAI API error:', apiError);
      
      // Use smart fallback
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastTurnAnalysis, isFirstQuestion);
      
      // Store fallback analysis
      try {
        await supabase
          .from('ai_analyses')
          .insert({
            room_id: roomId,
            analysis_type: 'question_selection_fallback',
            input_data: {
              available_questions: availableQuestions.length,
              last_turn_analysis: lastTurnAnalysis,
              last_turn_responses: lastTurnResponseData.length,
              is_first_question: isFirstQuestion,
              level: currentLevel,
              language: language,
              failure_reason: failureReason,
              processing_time: Date.now() - startTime
            },
            ai_response: {
              selectedQuestionIndex: availableQuestions.findIndex(q => q.id === fallbackQuestion.id),
              reasoning: 'Smart random fallback due to AI selection failure',
              targetArea: 'general',
              selected_question: fallbackQuestion,
              fallback_method: 'smart_random'
            }
          });
      } catch (analysisError) {
        console.warn('⚠️ Failed to store fallback analysis:', analysisError);
      }

      console.log('🎲 Using smart fallback selection:', {
        selectedQuestion: fallbackQuestion.text,
        method: 'smart_random_fallback',
        processingTime: Date.now() - startTime
      });

      return new Response(JSON.stringify({
        question: fallbackQuestion,
        reasoning: 'Selected using intelligent fallback due to AI service unavailability',
        targetArea: 'general',
        selectionMethod: 'smart_random_fallback',
        fallbackReason: failureReason
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate AI response
    const selectedQuestion = availableQuestions[aiResponse.selectedQuestionIndex];
    if (!selectedQuestion) {
      failureReason = `Invalid question index selected: ${aiResponse.selectedQuestionIndex}`;
      console.error('❌ Invalid question index:', aiResponse.selectedQuestionIndex);
      
      // Use smart fallback
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastTurnAnalysis, isFirstQuestion);
      
      return new Response(JSON.stringify({
        question: fallbackQuestion,
        reasoning: 'Smart fallback used due to invalid AI selection',
        targetArea: 'general',
        selectionMethod: 'smart_random_fallback',
        fallbackReason: failureReason
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store successful AI analysis
    try {
      await supabase
        .from('ai_analyses')
        .insert({
          room_id: roomId,
          analysis_type: 'question_selection',
          input_data: {
            available_questions: availableQuestions.length,
            last_turn_analysis: lastTurnAnalysis,
            last_turn_responses: lastTurnResponseData.length,
            is_first_question: isFirstQuestion,
            level: currentLevel,
            language: language,
            processing_time: Date.now() - startTime
          },
          ai_response: {
            ...aiResponse,
            selected_question: selectedQuestion,
            processing_time: Date.now() - startTime
          }
        });
    } catch (analysisError) {
      console.warn('⚠️ Failed to store AI analysis:', analysisError);
      // Don't throw, just log the warning
    }

    console.log('✅ AI question selection successful:', {
      isFirstQuestion,
      selectedQuestion: selectedQuestion.text.substring(0, 50) + '...',
      reasoning: aiResponse.reasoning,
      targetArea: aiResponse.targetArea,
      processingTime: Date.now() - startTime
    });

    return new Response(JSON.stringify({
      question: selectedQuestion,
      reasoning: aiResponse.reasoning,
      targetArea: aiResponse.targetArea,
      selectionMethod: 'ai_intelligent'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error in intelligent-question-selector:', {
      error: error.message,
      failureReason,
      processingTime
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackToRandom: true,
      failureReason: failureReason || error.message,
      processingTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

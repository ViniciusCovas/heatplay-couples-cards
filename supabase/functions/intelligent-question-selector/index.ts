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
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    // Handle specific OpenAI rate limit errors
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      const waitTime = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
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
  
  return levelData.id;
}

// Enhanced OpenAI API call with better error handling
async function callOpenAIWithRetry(promptContent: string): Promise<any> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [{ role: 'user', content: promptContent }],
          temperature: 0.7,
          max_tokens: 300,
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
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API call timed out after 30 seconds');
      }
      throw error;
    }
  }, 1, 'OpenAI API call');
}

// Smart fallback function that considers context
function getSmartRandomFallback(availableQuestions: any[], lastResponseAnalysis: any, isFirstQuestion: boolean): any {
  if (isFirstQuestion) {
    // For first questions, prefer general or introductory questions
    const introQuestions = availableQuestions.filter(q => 
      q.category && (q.category.includes('general') || q.category.includes('intro'))
    );
    if (introQuestions.length > 0) {
      return introQuestions[Math.floor(Math.random() * introQuestions.length)];
    }
  }

  // If we have last response analysis, try to balance areas
  if (lastResponseAnalysis.honesty !== undefined) {
    // Find the lowest scoring area from the last response
    const scores = [
      { area: 'honesty', score: lastResponseAnalysis.honesty },
      { area: 'attraction', score: lastResponseAnalysis.attraction },
      { area: 'intimacy', score: lastResponseAnalysis.intimacy },
      { area: 'surprise', score: lastResponseAnalysis.surprise }
    ];
    
    const lowestArea = scores.reduce((min, current) => current.score < min.score ? current : min);
    
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


    // Validate OpenAI API key
    if (!openAIApiKey) {
      failureReason = 'OpenAI API key not configured in environment';
      throw new Error(failureReason);
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Parallel data fetching with individual error handling
    const [recentResponses, room, levelId] = await Promise.allSettled([
      // Get only the most recent response pair (last 2 responses) for analysis
      retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('game_responses')
          .select('*')
          .eq('room_id', roomId)
          .not('evaluation', 'is', null) // Only get evaluated responses
          .order('created_at', { ascending: false })
          .limit(2); // Only get the last 2 responses (most recent turn)

        if (error) throw new Error(`Failed to fetch recent responses: ${error.message}`);
        return data || [];
      }, 1, 'recent responses fetch'),

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
    if (recentResponses.status === 'rejected') {
      failureReason = `Database error: ${recentResponses.reason.message}`;
      throw recentResponses.reason;
    }
    if (room.status === 'rejected') {
      failureReason = `Room fetch error: ${room.reason.message}`;
      throw room.reason;
    }
    if (levelId.status === 'rejected') {
      failureReason = `Level lookup error: ${levelId.reason.message}`;
      throw levelId.reason;
    }

    const recentResponseData = recentResponses.value;
    const roomData = room.value;
    const levelIdValue = levelId.value;

    // Get available questions with retry
    const questions = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .rpc('get_random_questions_for_level', {
          level_id_param: levelIdValue,
          language_param: language,
          limit_param: 50
        });

      if (error) throw new Error(`Failed to fetch questions: ${error.message}`);
      return data || [];
    }, 1, 'questions fetch');

    // Filter out already used questions
    const usedCards = roomData.used_cards || [];
    const availableQuestions = questions.filter((q: any) => !usedCards.includes(q.text));

    if (availableQuestions.length === 0) {
      failureReason = 'No available questions for this level and language';
      throw new Error(failureReason);
    }

    // Analyze only the most recent response for context (keep prompt short)
    let lastResponseAnalysis = { hasData: false };
    if (recentResponseData.length > 0) {
      const lastResponse = recentResponseData[0];
      if (lastResponse.evaluation) {
        try {
          const evaluation = JSON.parse(lastResponse.evaluation);
          lastResponseAnalysis = {
            hasData: true,
            honesty: evaluation.honesty || 0,
            attraction: evaluation.attraction || 0,
            intimacy: evaluation.intimacy || 0,
            surprise: evaluation.surprise || 0,
            response_time: lastResponse.response_time || 0
          };
        } catch (e) {
          // Failed to parse evaluation - continue without analysis
        }
      }
    }

    

    // Compact AI prompt focusing only on the immediate emotional state
    const promptContent = `You are GetClose AI, selecting the next question to deepen this couple's connection.

Context:
- Level: ${currentLevel} (${language})
- Is First Question: ${isFirstQuestion}
- Available Questions: ${availableQuestions.length}

${lastResponseAnalysis.hasData ? `
Most Recent Response Analysis:
- Honesty: ${lastResponseAnalysis.honesty}/10
- Attraction: ${lastResponseAnalysis.attraction}/10
- Intimacy: ${lastResponseAnalysis.intimacy}/10
- Surprise: ${lastResponseAnalysis.surprise}/10
- Response Time: ${lastResponseAnalysis.response_time}ms

Strategy: Based on their most recent emotional state, what question would create the deepest connection right now?
` : `
First Question Strategy: Choose an engaging opener that creates comfort and encourages vulnerability.
`}

Available Questions:
${availableQuestions.map((q: any, i: number) => `${i + 1}. [${q.category || 'general'}] ${q.text}`).join('\n')}

Select the ONE question that will create the deepest connection based on their current emotional state.

Respond with ONLY a JSON object:
{
  "selectedQuestionIndex": [0-based index],
  "reasoning": "[2-3 sentences explaining why this question is perfect right now]",
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
        throw new Error(failureReason);
      }
    } catch (apiError) {
      failureReason = `OpenAI API failed: ${apiError.message}`;
      
      // Use smart fallback based on last response
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastResponseAnalysis, isFirstQuestion);
      
      // Store fallback analysis
      try {
        await supabase
          .from('ai_analyses')
          .insert({
            room_id: roomId,
            analysis_type: 'question_selection_fallback',
            input_data: {
              available_questions: availableQuestions.length,
              last_response_analysis: lastResponseAnalysis,
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
        // Failed to store analysis - continue
      }

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
      
      // Use smart fallback
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastResponseAnalysis, isFirstQuestion);
      
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
            last_response_analysis: lastResponseAnalysis,
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
      // Failed to store analysis - continue
    }

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
    console.error('Error in intelligent-question-selector:', error.message);
    
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

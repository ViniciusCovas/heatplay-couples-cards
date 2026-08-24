
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRoomAccess, getCallerUser } from '../_shared/guards.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ---- Tunable knobs (see ALGORITHM.md) --------------------------------------
const OPENAI_MODEL = 'gpt-4o-mini';
const SELECTOR_TEMPERATURE = 0.7;
const SELECTOR_MAX_TOKENS = 250;
const CANDIDATE_POOL_SIZE = 20; // questions shown to the model per selection
const OPENAI_TIMEOUT_MS = 30000;

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

// Enhanced OpenAI API call with better error handling.
// Uses response_format json_object so the model must return strict JSON.
async function callOpenAIWithRetry(promptContent: string): Promise<any> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You select questions for a couples connection game. Respond with a single valid JSON object only.' },
            { role: 'user', content: promptContent }
          ],
          temperature: SELECTOR_TEMPERATURE,
          max_tokens: SELECTOR_MAX_TOKENS,
          response_format: { type: 'json_object' },
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
        throw new Error(`OpenAI API call timed out after ${OPENAI_TIMEOUT_MS / 1000} seconds`);
      }
      throw error;
    }
  }, 1, 'OpenAI API call');
}

/**
 * Which question categories serve which connection dimension.
 *
 * The seeded question catalogue uses Spanish category words
 * (see supabase/migrations/20250713203321_*.sql): `reflexion`, `dinamica`,
 * `profunda`, `intima`. The previous implementation substring-matched the
 * category against the dimension NAME ('honesty', 'attraction', ...), which
 * never matched any real category, so the "target the weakest dimension"
 * branch was dead. This explicit table maps each dimension to the categories
 * that actually exist, with the English equivalents kept for catalogues that
 * are seeded in English.
 */
const DIMENSION_CATEGORIES: Record<string, string[]> = {
  honesty: ['profunda', 'reflexion', 'deep', 'honesty', 'reflection'],
  attraction: ['dinamica', 'intima', 'attraction', 'playful', 'dynamic'],
  intimacy: ['intima', 'profunda', 'intimacy', 'intimate'],
  surprise: ['dinamica', 'reflexion', 'surprise', 'fun', 'dynamic'],
};

function categoriesForDimension(dimension: string): string[] {
  return DIMENSION_CATEGORIES[dimension] ?? [];
}

// Smart fallback function that considers context
function getSmartRandomFallback(availableQuestions: any[], lastResponseAnalysis: any, isFirstQuestion: boolean, recentCategories: string[] = []): any {
  if (isFirstQuestion) {
    // For first questions, prefer general or introductory questions
    const introQuestions = availableQuestions.filter(q =>
      q.category && (q.category.includes('general') || q.category.includes('intro'))
    );
    if (introQuestions.length > 0) {
      return introQuestions[Math.floor(Math.random() * introQuestions.length)];
    }
  }

  // Prefer a category we have not just asked, to keep the session varied
  const freshCategoryQuestions = availableQuestions.filter(q =>
    q.category && !recentCategories.includes(q.category)
  );
  const pool = freshCategoryQuestions.length > 0 ? freshCategoryQuestions : availableQuestions;

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

    // Try to find questions that might improve this area, using the explicit
    // dimension -> real-category mapping (see DIMENSION_CATEGORIES).
    const wanted = categoriesForDimension(lowestArea.area);
    if (wanted.length > 0) {
      const matches = (list: any[]) => list.filter(q =>
        q.category && wanted.includes(String(q.category).trim().toLowerCase())
      );

      // Prefer a fresh category first, then any question of the target
      // categories, then fall through to plain variety selection below.
      const targetQuestions = matches(pool).length > 0 ? matches(pool) : matches(availableQuestions);

      if (targetQuestions.length > 0) {
        return targetQuestions[Math.floor(Math.random() * targetQuestions.length)];
      }
    }
  }

  // Default random selection
  return pool[Math.floor(Math.random() * pool.length)];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const method = req.method;
  const corsHeaders = getCorsHeaders(origin);

  console.log(`[${new Date().toISOString()}] ${method} request from origin: ${origin || 'unknown'}`);

  // Enhanced CORS preflight handling
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  const startTime = Date.now();
  let failureReason = '';

  try {
    const { roomId, currentLevel, language: requestLanguage = 'en', isFirstQuestion = false } = await req.json();

    // ---- Input validation ------------------------------------------------
    if (typeof roomId !== 'string' || !UUID_RE.test(roomId)) {
      return new Response(JSON.stringify({ error: 'Invalid roomId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel > 10) {
      return new Response(JSON.stringify({ error: 'Invalid currentLevel' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing request for room ${roomId}, level ${currentLevel}, requested language ${requestLanguage}`);

    // Validate OpenAI API key
    if (!openAIApiKey) {
      failureReason = 'OpenAI API key not configured in environment';
      throw new Error(failureReason);
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // ---- Access guard ----------------------------------------------------
    // Both players (including the anonymous partner, who authenticates with
    // the project anon key) call this during gameplay. The room must be a
    // real, currently ACTIVE game; identified callers must additionally be
    // the host or a participant. This stops anyone from burning the OpenAI
    // budget against arbitrary/finished rooms.
    const caller = await getCallerUser(req);
    const access = await checkRoomAccess(supabase, roomId, caller?.id ?? null, {
      requireActive: true,
    });
    if (!access.ok) {
      console.warn(`intelligent-question-selector: access denied for room ${roomId}: ${access.error}`);
      return new Response(JSON.stringify({ error: access.error }), {
        status: access.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get room data first: we need the room's own selected_language so
    // questions are always served in the language the couple chose for the
    // room, regardless of what UI language the calling client happens to use.
    const roomData = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('used_cards, selected_language')
        .eq('id', roomId)
        .single();

      if (error) throw new Error(`Failed to fetch room data: ${error.message}`);
      return data;
    }, 1, 'room data fetch');

    const language = roomData.selected_language || requestLanguage;
    if (roomData.selected_language && roomData.selected_language !== requestLanguage) {
      console.log(`Language override: room selected_language=${roomData.selected_language} (client sent ${requestLanguage})`);
    }

    // Parallel data fetching with individual error handling
    const [recentResponses, levelId] = await Promise.allSettled([
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

      // Get level ID with caching
      getCachedLevelId(supabase, currentLevel, language)
    ]);

    // Handle individual failures
    if (recentResponses.status === 'rejected') {
      failureReason = `Database error: ${recentResponses.reason.message}`;
      throw recentResponses.reason;
    }
    if (levelId.status === 'rejected') {
      failureReason = `Level lookup error: ${levelId.reason.message}`;
      throw levelId.reason;
    }

    const recentResponseData = recentResponses.value;
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

    // Filter out already used questions.
    // NOTE: used_cards historically mixes formats — the DB trigger
    // (handle_evaluation_completion_v5 / select_next_card_robust) stores
    // question IDs, while older client code stored question text. Match both
    // so a question is never repeated within a room.
    const usedCards: string[] = roomData.used_cards || [];
    const usedSet = new Set(usedCards);
    const availableQuestions = questions.filter((q: any) =>
      !usedSet.has(q.text) && !usedSet.has(String(q.id))
    );

    if (availableQuestions.length === 0) {
      failureReason = 'No available questions for this level and language';
      throw new Error(failureReason);
    }

    // Categories of the couple's most recent cards, to steer variety
    const recentCardIds = recentResponseData.map((r: any) => String(r.card_id)).filter(Boolean);
    let recentCategories: string[] = [];
    if (recentCardIds.length > 0) {
      try {
        const { data: recentQs } = await supabase
          .from('questions')
          .select('id, category')
          .in('id', recentCardIds);
        recentCategories = (recentQs || []).map((q: any) => q.category).filter(Boolean);
      } catch (_e) {
        // Non-fatal; variety hint is best-effort
      }
    }

    // Analyze only the most recent response for context (keep prompt short)
    let lastResponseAnalysis: any = { hasData: false };
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
          console.log('Failed to parse evaluation:', e);
        }
      }
    }

    // Cap the candidate list shown to the model (cost + focus). The RPC
    // already randomizes order, so a slice is a random sample.
    const candidates = availableQuestions.slice(0, CANDIDATE_POOL_SIZE);

    // Compact AI prompt focusing only on the immediate emotional state.
    // Evaluations are on a 1-5 scale (see ResponseEvaluation UI).
    const promptContent = `You are GetClose AI, selecting the next question to deepen this couple's connection.

Context:
- Level: ${currentLevel} (language: ${language})
- Is First Question: ${isFirstQuestion}
- Recent question categories (avoid repeating the same category back-to-back): ${recentCategories.length ? recentCategories.join(', ') : 'none yet'}

${lastResponseAnalysis.hasData ? `
Most Recent Response Evaluation (scale 1-5):
- Honesty: ${lastResponseAnalysis.honesty}/5
- Attraction: ${lastResponseAnalysis.attraction}/5
- Intimacy: ${lastResponseAnalysis.intimacy}/5
- Surprise: ${lastResponseAnalysis.surprise}/5
- Response Time: ${lastResponseAnalysis.response_time}ms

Strategy: Based on their most recent emotional state, pick the question that best deepens connection right now. Prefer gently raising their weakest dimension, and vary the category/theme from recent questions so the session feels like a journey, not a loop.
` : `
First Question Strategy: Choose an engaging opener that creates comfort and encourages vulnerability.
`}

Available Questions (0-based index):
${candidates.map((q: any, i: number) => `${i}. [${q.category || 'general'}] ${q.text}`).join('\n')}

Respond with ONLY a JSON object:
{
  "selectedQuestionIndex": <integer, 0-based index into the list above>,
  "reasoning": "<2-3 sentences explaining why this question is perfect right now>",
  "targetArea": "<honesty|attraction|intimacy|surprise>"
}`;

    // Call OpenAI with enhanced error handling
    let aiResponse;
    try {
      console.log('Calling OpenAI API...');
      const data = await callOpenAIWithRetry(promptContent);

      try {
        aiResponse = JSON.parse(data.choices[0].message.content);
        console.log('AI response parsed successfully');
      } catch (parseError) {
        failureReason = `AI returned invalid JSON format: ${data.choices[0].message.content}`;
        throw new Error(failureReason);
      }
    } catch (apiError) {
      console.error('OpenAI API failed:', apiError.message);
      failureReason = `OpenAI API failed: ${apiError.message}`;

      // Use smart fallback based on last response
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastResponseAnalysis, isFirstQuestion, recentCategories);

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
        console.error('Failed to store analysis:', analysisError);
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
    const idx = aiResponse.selectedQuestionIndex;
    const selectedQuestion = Number.isInteger(idx) ? candidates[idx] : undefined;
    if (!selectedQuestion) {
      failureReason = `Invalid question index selected: ${aiResponse.selectedQuestionIndex}`;

      // Use smart fallback
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, lastResponseAnalysis, isFirstQuestion, recentCategories);

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
      console.error('Failed to store analysis:', analysisError);
    }

    console.log(`Successfully selected question: ${selectedQuestion.text.substring(0, 50)}...`);

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

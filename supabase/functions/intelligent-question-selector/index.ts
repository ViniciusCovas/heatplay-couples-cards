
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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
      console.log('✅ OpenAI API call successful');
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
function getSmartRandomFallback(availableQuestions: any[], responseAnalysis: any, isFirstQuestion: boolean): any {
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

  // If we have response analysis, try to balance areas
  if (responseAnalysis.count > 0) {
    const avgHonesty = responseAnalysis.honesty / responseAnalysis.count;
    const avgAttraction = responseAnalysis.attraction / responseAnalysis.count;
    const avgIntimacy = responseAnalysis.intimacy / responseAnalysis.count;
    const avgSurprise = responseAnalysis.surprise / responseAnalysis.count;
    
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
    const [responses, room, levelId] = await Promise.allSettled([
      // Get previous game responses
      retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('game_responses')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw new Error(`Failed to fetch game responses: ${error.message}`);
        return data || [];
      }, 1, 'game responses fetch'),

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
    if (responses.status === 'rejected') {
      failureReason = `Database error: ${responses.reason.message}`;
      throw responses.reason;
    }
    if (room.status === 'rejected') {
      failureReason = `Room fetch error: ${room.reason.message}`;
      throw room.reason;
    }
    if (levelId.status === 'rejected') {
      failureReason = `Level lookup error: ${levelId.reason.message}`;
      throw levelId.reason;
    }

    const responseData = responses.value;
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
      console.warn('⚠️ No available questions for this level');
      throw new Error(failureReason);
    }

    console.log('📊 Data fetched successfully:', {
      availableQuestions: availableQuestions.length,
      usedCards: usedCards.length,
      previousResponses: responseData.length
    });

    // Analyze responses for patterns
    const responseAnalysis = responseData.reduce((acc: any, response: any) => {
      if (response.evaluation) {
        try {
          const evaluation = JSON.parse(response.evaluation);
          acc.honesty = (acc.honesty || 0) + (evaluation.honesty || 0);
          acc.attraction = (acc.attraction || 0) + (evaluation.attraction || 0);
          acc.intimacy = (acc.intimacy || 0) + (evaluation.intimacy || 0);
          acc.surprise = (acc.surprise || 0) + (evaluation.surprise || 0);
          acc.count++;
        } catch (e) {
          console.warn('⚠️ Failed to parse evaluation:', e);
        }
      }
      return acc;
    }, { count: 0 });

    console.log('📈 Response analysis:', responseAnalysis);

    // Enhanced prompt for AI selection
    const promptContent = `You are GetClose AI, an expert relationship coach helping couples connect deeper through strategic question selection.

Context:
- Relationship Level: ${currentLevel}
- Language: ${language}
- Is First Question: ${isFirstQuestion}
- Previous Responses: ${responseData.length}
- Response Analysis: ${JSON.stringify(responseAnalysis)}
- Available Questions: ${availableQuestions.length}

Available Questions:
${availableQuestions.map((q: any, i: number) => `${i + 1}. [${q.category || 'general'}] ${q.text}`).join('\n')}

Your mission: Select the ONE question that will create the deepest connection right now.

${isFirstQuestion ? `
FIRST QUESTION Strategy:
- Start with an engaging, welcoming question that sets a positive tone
- Choose something that invites vulnerability without being too intense
- Consider the relationship level - higher levels can start with more depth
- Focus on creating comfort and encouraging open sharing
- Target area should be based on what typically creates the best foundation for connection
` : `
FOLLOW-UP Strategy:
- Analyze previous responses and evaluations to identify growth areas
- If honesty scores are low: Choose questions that encourage vulnerability
- If attraction scores are low: Select questions about desires and chemistry  
- If intimacy scores are low: Pick questions about emotions and closeness
- If surprise scores are low: Choose unexpected or playful questions
- Build on previous conversations and deepen the connection
`}

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
        console.error('❌ Failed to parse OpenAI response:', data.choices[0].message.content);
        throw new Error(failureReason);
      }
    } catch (apiError) {
      failureReason = `OpenAI API failed: ${apiError.message}`;
      console.error('❌ OpenAI API error:', apiError);
      
      // Use smart fallback
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, responseAnalysis, isFirstQuestion);
      
      // Store fallback analysis
      try {
        await supabase
          .from('ai_analyses')
          .insert({
            room_id: roomId,
            analysis_type: 'question_selection_fallback',
            input_data: {
              available_questions: availableQuestions.length,
              response_analysis: responseAnalysis,
              session_responses: responseData.length,
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
      const fallbackQuestion = getSmartRandomFallback(availableQuestions, responseAnalysis, isFirstQuestion);
      
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
            response_analysis: responseAnalysis,
            session_responses: responseData.length,
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

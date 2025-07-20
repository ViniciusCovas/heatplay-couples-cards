
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AI Question Selector starting...');
    
    const { roomId, currentLevel, language = 'en', isFirstQuestion = false } = await req.json();
    console.log('📝 Request params:', { roomId, currentLevel, language, isFirstQuestion });

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get previous game responses and evaluations
    const { data: responses, error: responsesError } = await supabase
      .from('game_responses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (responsesError) {
      console.error('❌ Failed to fetch responses:', responsesError);
      throw new Error(`Failed to fetch game responses: ${responsesError.message}`);
    }

    console.log('📊 Found', responses?.length || 0, 'previous responses');

    // Get used cards to avoid repetition
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('used_cards')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('❌ Failed to fetch room:', roomError);
      throw new Error(`Failed to fetch room data: ${roomError.message}`);
    }

    // Get available questions for the level
    const { data: questions, error: questionsError } = await supabase
      .rpc('get_random_questions_for_level', {
        level_id_param: currentLevel,
        language_param: language,
        limit_param: 50
      });

    if (questionsError) {
      console.error('❌ Failed to fetch questions:', questionsError);
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    console.log('❓ Found', questions?.length || 0, 'questions for level', currentLevel);

    // Filter out already used questions
    const usedCards = room.used_cards || [];
    const availableQuestions = questions.filter((q: any) => !usedCards.includes(q.id));

    if (availableQuestions.length === 0) {
      console.error('❌ No available questions');
      throw new Error('No available questions for this level');
    }

    console.log('✅ Available questions after filtering:', availableQuestions.length);

    // Analyze evaluation patterns
    const evaluationStats = responses.reduce((acc: any, response: any) => {
      if (response.evaluation) {
        const eval = JSON.parse(response.evaluation);
        acc.honesty = (acc.honesty || 0) + (eval.honesty || 0);
        acc.attraction = (acc.attraction || 0) + (eval.attraction || 0);
        acc.intimacy = (acc.intimacy || 0) + (eval.intimacy || 0);
        acc.surprise = (acc.surprise || 0) + (eval.surprise || 0);
        acc.count++;
      }
      return acc;
    }, { count: 0 });

    console.log('📈 Evaluation stats:', evaluationStats);

    // Create AI prompt
    const prompt = `You are GetClose AI, an expert relationship coach that helps couples connect deeper through strategic question selection.

Context:
- Relationship Level: ${currentLevel}
- Language: ${language}
- Is First Question: ${isFirstQuestion}
- Previous Responses: ${responses.length}
- Session Statistics: ${JSON.stringify(evaluationStats)}

Available Questions:
${availableQuestions.map((q: any, i: number) => `${i + 1}. [${q.category}] ${q.text}`).join('\n')}

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

    console.log('🤖 Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('❌ OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🤖 OpenAI response received');
    
    const aiResponse = JSON.parse(data.choices[0].message.content);
    const selectedQuestion = availableQuestions[aiResponse.selectedQuestionIndex];

    console.log('✨ AI selected question:', selectedQuestion.text);
    console.log('🎯 Target area:', aiResponse.targetArea);
    console.log('💭 Reasoning:', aiResponse.reasoning);

    // Store AI analysis
    await supabase
      .from('ai_analyses')
      .insert({
        room_id: roomId,
        analysis_type: 'question_selection',
        input_data: {
          available_questions: availableQuestions.length,
          evaluation_stats: evaluationStats,
          session_responses: responses.length,
          is_first_question: isFirstQuestion
        },
        ai_response: {
          ...aiResponse,
          selected_question: selectedQuestion
        }
      });

    console.log('✅ AI question selection successful');

    return new Response(JSON.stringify({
      question: selectedQuestion,
      reasoning: aiResponse.reasoning,
      targetArea: aiResponse.targetArea,
      selectionMethod: 'ai_intelligent'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error in intelligent-question-selector:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackToRandom: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
    const { roomId, language = 'en' } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get all game data
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      throw new Error(`Failed to fetch room data: ${roomError.message}`);
    }

    // Get all responses with evaluations
    const { data: responses, error: responsesError } = await supabase
      .from('game_responses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId);

    if (participantsError) {
      throw new Error(`Failed to fetch participants: ${participantsError.message}`);
    }

    // Calculate session statistics
    const sessionStats = responses.reduce((acc: any, response: any) => {
      if (response.evaluation) {
        const eval = JSON.parse(response.evaluation);
        acc.totalHonesty += eval.honesty || 0;
        acc.totalAttraction += eval.attraction || 0;
        acc.totalIntimacy += eval.intimacy || 0;
        acc.totalSurprise += eval.surprise || 0;
        acc.evaluationCount++;
      }
      return acc;
    }, {
      totalHonesty: 0,
      totalAttraction: 0,
      totalIntimacy: 0,
      totalSurprise: 0,
      evaluationCount: 0
    });

    // Calculate averages
    const avgScores = {
      honesty: sessionStats.evaluationCount ? sessionStats.totalHonesty / sessionStats.evaluationCount : 0,
      attraction: sessionStats.evaluationCount ? sessionStats.totalAttraction / sessionStats.evaluationCount : 0,
      intimacy: sessionStats.evaluationCount ? sessionStats.totalIntimacy / sessionStats.evaluationCount : 0,
      surprise: sessionStats.evaluationCount ? sessionStats.totalSurprise / sessionStats.evaluationCount : 0
    };

    const culturalContext = {
      en: "Western relationship dynamics",
      es: "Latin American relationship culture",
      fr: "French romantic traditions",
      pt: "Brazilian relationship values"
    };

    const prompt = `You are GetClose AI, an expert relationship and compatibility analyst. Analyze this couple's session and provide deep insights.

Session Data:
- Duration: ${Math.round((new Date(room.finished_at || new Date()).getTime() - new Date(room.started_at).getTime()) / 60000)} minutes
- Level: ${room.level}
- Total Questions: ${responses.length}
- Language/Culture: ${language} (${culturalContext[language as keyof typeof culturalContext] || 'International'})

Connection Scores (1-10 scale):
- Honesty: ${avgScores.honesty.toFixed(1)}/10
- Attraction: ${avgScores.attraction.toFixed(1)}/10  
- Intimacy: ${avgScores.intimacy.toFixed(1)}/10
- Surprise: ${avgScores.surprise.toFixed(1)}/10

Individual Responses:
${responses.map((r: any, i: number) => `
Question ${i + 1}: ${r.response || 'No response'}
Evaluation: ${r.evaluation ? JSON.stringify(JSON.parse(r.evaluation)) : 'Not evaluated'}
Response Time: ${r.response_time || 0}ms
`).join('\n')}

Provide a comprehensive analysis in the following JSON format:
{
  "compatibilityScore": [0-100 overall compatibility],
  "strengthAreas": [
    {
      "area": "[honesty|attraction|intimacy|surprise]",
      "score": [1-10],
      "insight": "What this reveals about their connection"
    }
  ],
  "growthAreas": [
    {
      "area": "[honesty|attraction|intimacy|surprise]", 
      "score": [1-10],
      "recommendation": "Specific actionable advice"
    }
  ],
  "keyInsights": [
    "Deep insight about their relationship dynamic",
    "Pattern observation about their communication",
    "Prediction about their relationship potential"
  ],
  "personalizedTips": [
    "Specific activity or conversation starter",
    "Relationship exercise tailored to their scores",
    "Next step recommendation for their journey"
  ],
  "culturalNotes": "Advice considering their cultural context",
  "relationshipPhase": "[exploring|building|deepening|committed]",
  "nextSessionRecommendation": "What level or focus for next time"
}

Be insightful, specific, and culturally sensitive. Focus on actionable advice.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Store the final analysis
    await supabase
      .from('ai_analyses')
      .insert({
        room_id: roomId,
        analysis_type: 'final_report',
        input_data: {
          session_stats: sessionStats,
          avg_scores: avgScores,
          total_responses: responses.length,
          session_duration: Math.round((new Date(room.finished_at || new Date()).getTime() - new Date(room.started_at).getTime()) / 60000)
        },
        ai_response: analysis
      });

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getclose-ai-analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
        try {
          const evalData = JSON.parse(response.evaluation);
          acc.totalHonesty += evalData.honesty || 0;
          acc.totalAttraction += evalData.attraction || 0;
          acc.totalIntimacy += evalData.intimacy || 0;
          acc.totalSurprise += evalData.surprise || 0;
          acc.evaluationCount++;
        } catch (parseError) {
          // Failed to parse evaluation - continue
        }
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

    const sessionDuration = room.finished_at && room.started_at 
      ? Math.round((new Date(room.finished_at).getTime() - new Date(room.started_at).getTime()) / 60000)
      : 0;

    // Calculate advanced psychological metrics
    const bondMap = {
      closeness: avgScores.intimacy * (1 - Math.min(1, sessionStats.evaluationCount > 1 ? 
        Math.sqrt(sessionStats.totalIntimacy / sessionStats.evaluationCount) / 5 : 0)), // Stability adjustment
      spark: (avgScores.attraction + avgScores.surprise) / 2, // Passion component
      anchor: avgScores.honesty // Trust/commitment proxy
    };

    // Calculate volatility (standard deviation)
    const calculateStdDev = (values: number[]) => {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    };

    const honestyScores = responses.filter(r => r.evaluation).map(r => {
      try { return JSON.parse(r.evaluation).honesty || 0; } catch { return 0; }
    });
    const attractionScores = responses.filter(r => r.evaluation).map(r => {
      try { return JSON.parse(r.evaluation).attraction || 0; } catch { return 0; }
    });
    const intimacyScores = responses.filter(r => r.evaluation).map(r => {
      try { return JSON.parse(r.evaluation).intimacy || 0; } catch { return 0; }
    });
    const surpriseScores = responses.filter(r => r.evaluation).map(r => {
      try { return JSON.parse(r.evaluation).surprise || 0; } catch { return 0; }
    });

    const volatility = {
      honesty: calculateStdDev(honestyScores),
      attraction: calculateStdDev(attractionScores),
      intimacy: calculateStdDev(intimacyScores),
      surprise: calculateStdDev(surpriseScores)
    };

    // Calculate correlations
    const calculateCorrelation = (x: number[], y: number[]) => {
      if (x.length !== y.length || x.length === 0) return 0;
      const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
      const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
      let numerator = 0, denomX = 0, denomY = 0;
      for (let i = 0; i < x.length; i++) {
        const deltaX = x[i] - meanX;
        const deltaY = y[i] - meanY;
        numerator += deltaX * deltaY;
        denomX += deltaX * deltaX;
        denomY += deltaY * deltaY;
      }
      const denominator = Math.sqrt(denomX * denomY);
      return denominator === 0 ? 0 : numerator / denominator;
    };

    const honestyIntimacyCorrelation = calculateCorrelation(honestyScores, intimacyScores);
    const attractionSurpriseCorrelation = calculateCorrelation(attractionScores, surpriseScores);

    // Detect breakthrough moments
    const breakthroughMoments = responses.filter((r, i) => {
      if (!r.evaluation) return false;
      try {
        const eval = JSON.parse(r.evaluation);
        return eval.honesty >= 4.5 || eval.intimacy >= 4.5 || eval.attraction >= 4.5 || eval.surprise >= 4.5;
      } catch { return false; }
    }).length;

    // Determine primary dynamic
    const primaryDynamic = bondMap.closeness > 3.5 ? 'Intimacy-Driven' :
                          bondMap.spark > 3.5 ? 'Passion-Driven' :
                          bondMap.anchor > 3.5 ? 'Trust-Driven' : 'Exploratory';

    // Determine communication DNA
    let communicationStyle = 'Balanced';
    if (honestyIntimacyCorrelation > 0.7 && volatility.honesty < 1.0) {
      communicationStyle = 'Validating';
    } else if (bondMap.spark > 4.0 && attractionSurpriseCorrelation > 0.6) {
      communicationStyle = 'Adventurous';
    } else if (bondMap.closeness > 4.0) {
      communicationStyle = 'Deep';
    } else if (breakthroughMoments > 2) {
      communicationStyle = 'Playful';
    }

    const prompt = `You are GetClose AI Intelligence, the world's most advanced relationship analysis system. You combine psychological frameworks (Triangular Theory of Love, EFT, Self-Expansion Model, Gottman Method) with deep data analysis to provide unprecedented relationship insights.

PSYCHOLOGICAL ANALYSIS COMPLETE:
==================================

Bond Map (Triangular Theory Implementation):
- Closeness (Intimacy + Stability): ${bondMap.closeness.toFixed(2)}/5.0
- Spark (Passion Component): ${bondMap.spark.toFixed(2)}/5.0  
- Anchor (Trust/Commitment): ${bondMap.anchor.toFixed(2)}/5.0

Communication DNA Analysis:
- Primary Dynamic: ${primaryDynamic}
- Communication Style: ${communicationStyle}
- Honesty-Intimacy Correlation: ${honestyIntimacyCorrelation.toFixed(3)}
- Attraction-Surprise Sync: ${attractionSurpriseCorrelation.toFixed(3)}

Volatility Metrics (Emotional Consistency):
- Honesty Variance: ${volatility.honesty.toFixed(2)}
- Attraction Variance: ${volatility.attraction.toFixed(2)}
- Intimacy Variance: ${volatility.intimacy.toFixed(2)}
- Surprise Variance: ${volatility.surprise.toFixed(2)}

Session Intelligence:
- Duration: ${sessionDuration} minutes
- Level: ${room.level} (Progressive Intimacy Scale)
- Breakthrough Moments: ${breakthroughMoments}
- Total Interactions: ${responses.length}
- Language/Culture: ${language}

Raw Interaction Data:
${responses.slice(0, 8).map((r: any, i: number) => `
Interaction ${i + 1}: "${r.response?.substring(0, 100) || 'No response'}..."
Psychological Assessment: ${r.evaluation ? (() => {
  try {
    const eval = JSON.parse(r.evaluation);
    return `H:${eval.honesty}/5, A:${eval.attraction}/5, I:${eval.intimacy}/5, S:${eval.surprise}/5`;
  } catch {
    return 'Assessment unavailable';
  }
})() : 'Not assessed'}
Response Authenticity: ${r.response_time || 0}ms
`).join('')}

GENERATE ADVANCED RELATIONSHIP INTELLIGENCE:
==========================================

Provide a sophisticated analysis that positions this as premium relationship intelligence. Use the advanced metrics above to create insights that feel deeply personal and scientifically grounded.

JSON Response Format:
{
  "compatibilityScore": [0-100, use Bond Map algorithm: ((closeness + spark + anchor) / 3) * 20],
  "relationshipPhase": "[exploring|building|deepening|mastering] - based on level and bond map",
  "strengthAreas": [
    {
      "area": "[honesty|attraction|intimacy|surprise]",
      "score": [exact pillar score],
      "insight": "Specific insight using actual data patterns and psychological framework"
    }
  ],
  "growthAreas": [
    {
      "area": "[lowest scoring pillar]",
      "score": [exact score],
      "recommendation": "Evidence-based advice using EFT/Gottman/Self-Expansion principles"
    }
  ],
  "keyInsights": [
    "Insight about their specific communication DNA pattern",
    "Analysis of their volatility/stability patterns",
    "Correlation-based observation about their sync",
    "Breakthrough moment significance"
  ],
  "personalizedTips": [
    "Action based on their primary dynamic",
    "Exercise targeting their growth area with scientific backing",
    "Next session focus based on their trajectory"
  ],
  "culturalNotes": "Culturally adapted advice for ${language} context",
  "nextSessionRecommendation": "Specific level and focus area based on their growth pattern",
  "intelligenceMarkers": {
    "primaryDynamic": "${primaryDynamic}",
    "communicationDNA": "${communicationStyle}",
    "volatilityProfile": "[stable|variable|dynamic] based on variance scores",
    "rarityPercentile": "[calculate rough percentile from overall scores]"
  }
}

Make this feel like a $200 relationship analysis, not a generic card game result. Use the specific metrics provided.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are GetClose AI Intelligence, the world\'s premier relationship analysis system. You provide sophisticated, psychology-based insights that help couples understand their connection at the deepest level. Always be specific, actionable, and scientifically grounded.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    let analysis;
    try {
      let content = data.choices[0].message.content;
      console.log('Raw OpenAI response:', content);
      
      // Handle markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Clean up any leading/trailing whitespace and non-JSON content
      const cleanContent = content.trim();
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = cleanContent.substring(jsonStart, jsonEnd);
      }
      
      analysis = JSON.parse(content);
      console.log('Parsed analysis:', analysis);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Content that failed to parse:', data.choices[0].message.content);
      throw new Error(`Failed to parse AI analysis response: ${parseError.message}`);
    }

    // Store the final analysis
    const { error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        room_id: roomId,
        analysis_type: 'getclose-ai-analysis',
        input_data: {
          session_stats: sessionStats,
          avg_scores: avgScores,
          total_responses: responses.length,
          session_duration: sessionDuration
        },
        ai_response: analysis
      });

    if (insertError) {
      // Don't throw here, just continue
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getclose-ai-analysis:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

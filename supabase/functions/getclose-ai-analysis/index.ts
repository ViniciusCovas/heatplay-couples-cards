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

// Helper functions
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    numerator += deltaX * deltaY;
    denomX += deltaX * deltaX;
    denomY += deltaY * deltaY;
  }
  
  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? 0 : numerator / denominator;
}

function parseEvaluation(evaluation: string): any {
  try {
    return JSON.parse(evaluation);
  } catch {
    return { honesty: 0, attraction: 0, intimacy: 0, surprise: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting AI analysis request...');
    
    const { roomId, language = 'en' } = await req.json();
    console.log('Room ID:', roomId, 'Language:', language);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch room data
    console.log('Fetching room data...');
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      throw new Error(`Failed to fetch room data: ${roomError.message}`);
    }

    // Fetch responses
    console.log('Fetching responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('game_responses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    console.log(`Found ${responses.length} responses`);

    // Calculate session statistics
    let totalHonesty = 0;
    let totalAttraction = 0;
    let totalIntimacy = 0;
    let totalSurprise = 0;
    let evaluationCount = 0;

    const honestyScores: number[] = [];
    const attractionScores: number[] = [];
    const intimacyScores: number[] = [];
    const surpriseScores: number[] = [];

    for (const response of responses) {
      if (response.evaluation) {
        const evalData = parseEvaluation(response.evaluation);
        totalHonesty += evalData.honesty || 0;
        totalAttraction += evalData.attraction || 0;
        totalIntimacy += evalData.intimacy || 0;
        totalSurprise += evalData.surprise || 0;
        evaluationCount++;

        honestyScores.push(evalData.honesty || 0);
        attractionScores.push(evalData.attraction || 0);
        intimacyScores.push(evalData.intimacy || 0);
        surpriseScores.push(evalData.surprise || 0);
      }
    }

    // Calculate averages
    const avgScores = {
      honesty: evaluationCount ? totalHonesty / evaluationCount : 0,
      attraction: evaluationCount ? totalAttraction / evaluationCount : 0,
      intimacy: evaluationCount ? totalIntimacy / evaluationCount : 0,
      surprise: evaluationCount ? totalSurprise / evaluationCount : 0
    };

    // Calculate bond map
    const bondMap = {
      closeness: avgScores.intimacy,
      spark: (avgScores.attraction + avgScores.surprise) / 2,
      anchor: avgScores.honesty
    };

    // Calculate volatility
    const volatility = {
      honesty: calculateStandardDeviation(honestyScores),
      attraction: calculateStandardDeviation(attractionScores),
      intimacy: calculateStandardDeviation(intimacyScores),
      surprise: calculateStandardDeviation(surpriseScores)
    };

    // Calculate correlations
    const honestyIntimacyCorrelation = calculateCorrelation(honestyScores, intimacyScores);
    const attractionSurpriseCorrelation = calculateCorrelation(attractionScores, surpriseScores);

    // Determine dynamics
    const primaryDynamic = bondMap.closeness > 3.5 ? 'Intimacy-Driven' :
                          bondMap.spark > 3.5 ? 'Passion-Driven' :
                          bondMap.anchor > 3.5 ? 'Trust-Driven' : 'Exploratory';

    let communicationStyle = 'Balanced';
    if (honestyIntimacyCorrelation > 0.7 && volatility.honesty < 1.0) {
      communicationStyle = 'Validating';
    } else if (bondMap.spark > 4.0 && attractionSurpriseCorrelation > 0.6) {
      communicationStyle = 'Adventurous';
    } else if (bondMap.closeness > 4.0) {
      communicationStyle = 'Deep';
    }

    const sessionDuration = room.finished_at && room.started_at 
      ? Math.round((new Date(room.finished_at).getTime() - new Date(room.started_at).getTime()) / 60000)
      : 0;

    // Build prompt for OpenAI
    const promptContent = `You are GetClose AI Intelligence, analyzing relationship dynamics.

ANALYSIS DATA:
- Bond Map: Closeness ${bondMap.closeness.toFixed(2)}, Spark ${bondMap.spark.toFixed(2)}, Anchor ${bondMap.anchor.toFixed(2)}
- Average Scores: Honesty ${avgScores.honesty.toFixed(2)}, Attraction ${avgScores.attraction.toFixed(2)}, Intimacy ${avgScores.intimacy.toFixed(2)}, Surprise ${avgScores.surprise.toFixed(2)}
- Primary Dynamic: ${primaryDynamic}
- Communication Style: ${communicationStyle}
- Session Duration: ${sessionDuration} minutes
- Total Responses: ${responses.length}
- Language: ${language}

Provide a sophisticated relationship analysis in this JSON format:
{
  "compatibilityScore": [0-100 based on bond map average * 20],
  "relationshipPhase": "[exploring|building|deepening|mastering]",
  "strengthAreas": [
    {
      "area": "[strongest pillar name]",
      "score": [score],
      "insight": "Specific insight about this strength"
    }
  ],
  "growthAreas": [
    {
      "area": "[weakest pillar name]", 
      "score": [score],
      "recommendation": "Actionable advice for improvement"
    }
  ],
  "keyInsights": [
    "Insight about communication pattern",
    "Analysis of emotional dynamics",
    "Observation about connection quality"
  ],
  "personalizedTips": [
    "Specific action for next session",
    "Exercise to strengthen bond",
    "Focus area recommendation"
  ],
  "culturalNotes": "Brief cultural context for ${language}",
  "nextSessionRecommendation": "Specific next steps",
  "intelligenceMarkers": {
    "primaryDynamic": "${primaryDynamic}",
    "communicationDNA": "${communicationStyle}",
    "volatilityProfile": "stable",
    "rarityPercentile": "75th"
  }
}

Focus on being specific, actionable, and premium quality.`;

    console.log('Calling OpenAI API...');
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
            content: 'You are GetClose AI Intelligence. Provide sophisticated relationship analysis in valid JSON format only.'
          },
          { role: 'user', content: promptContent }
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Parse AI response
    let analysis;
    try {
      let content = data.choices[0].message.content;
      
      // Clean up potential markdown formatting
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Find JSON object bounds
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd);
      }
      
      analysis = JSON.parse(content);
      console.log('Analysis parsed successfully');
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Store analysis in database
    const { error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        room_id: roomId,
        analysis_type: 'getclose-ai-analysis',
        input_data: {
          avg_scores: avgScores,
          bond_map: bondMap,
          total_responses: responses.length,
          session_duration: sessionDuration
        },
        ai_response: analysis
      });

    if (insertError) {
      console.warn('Failed to store analysis:', insertError.message);
    }

    console.log('Analysis completed successfully');
    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI analysis:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
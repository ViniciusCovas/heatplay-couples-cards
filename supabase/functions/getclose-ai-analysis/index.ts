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

    // Fetch responses with question data
    console.log('Fetching responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('game_responses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    // Fetch questions data separately for better performance
    const questionIds = [...new Set(responses?.map(r => r.card_id) || [])];
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, text, level_id, language, category')
      .in('id', questionIds);

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
    }

    // Create question lookup map
    const questionMap = (questions || []).reduce((acc, q) => {
      acc[q.id] = q;
      return acc;
    }, {} as Record<string, any>);

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

    // Enhanced analysis for premium intelligence
    const responseTimes = responses.map(r => r.response_time || 0).filter(t => t > 0);
    const avgResponseTime = responseTimes.length ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0;
    
    // Specific quote extraction with question text
    const topResponses = responses
      .filter(r => r.response && r.evaluation)
      .map((r, index) => {
        const evalData = parseEvaluation(r.evaluation);
        const avgScore = (evalData.honesty + evalData.attraction + evalData.intimacy + evalData.surprise) / 4;
        const questionText = questionMap[r.card_id]?.text || 'Unknown question';
        return { index, response: r.response, avgScore, evalData, questionText, cardId: r.card_id };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    // Breakthrough moment detection with question context
    const breakthroughMoments = [];
    responses.forEach((response, index) => {
      if (response.evaluation) {
        const evalData = parseEvaluation(response.evaluation);
        const questionText = questionMap[response.card_id]?.text || 'Unknown question';
        
        if (evalData.honesty >= 4.5) {
          breakthroughMoments.push({
            question: index + 1,
            questionText: questionText.substring(0, 80) + '...',
            type: 'trust_breakthrough',
            score: evalData.honesty,
            insight: `Question ${index + 1} triggered exceptional honesty (${evalData.honesty}/5)`,
            responsePreview: response.response?.substring(0, 60) + '...' || ''
          });
        }
        if (evalData.intimacy >= 4.5) {
          breakthroughMoments.push({
            question: index + 1,
            questionText: questionText.substring(0, 80) + '...',
            type: 'intimacy_peak',
            score: evalData.intimacy,
            insight: `Deep emotional connection achieved in Question ${index + 1} (${evalData.intimacy}/5)`,
            responsePreview: response.response?.substring(0, 60) + '...' || ''
          });
        }
        if (evalData.attraction >= 4.5) {
          breakthroughMoments.push({
            question: index + 1,
            questionText: questionText.substring(0, 80) + '...',
            type: 'attraction_spark',
            score: evalData.attraction,
            insight: `Significant attraction spike at Question ${index + 1} (${evalData.attraction}/5)`,
            responsePreview: response.response?.substring(0, 60) + '...' || ''
          });
        }
      }
    });

    // Build prompt for OpenAI
    const promptContent = `You are GetClose AI Intelligence 2.0, providing premium relationship analysis.

COMPREHENSIVE ANALYSIS DATA:
- Bond Map: Closeness ${bondMap.closeness.toFixed(2)}, Spark ${bondMap.spark.toFixed(2)}, Anchor ${bondMap.anchor.toFixed(2)}
- Average Scores: Honesty ${avgScores.honesty.toFixed(2)}, Attraction ${avgScores.attraction.toFixed(2)}, Intimacy ${avgScores.intimacy.toFixed(2)}, Surprise ${avgScores.surprise.toFixed(2)}
- Volatility Scores: H±${volatility.honesty.toFixed(2)}, A±${volatility.attraction.toFixed(2)}, I±${volatility.intimacy.toFixed(2)}, S±${volatility.surprise.toFixed(2)}
- Correlations: Honesty-Intimacy ${honestyIntimacyCorrelation.toFixed(3)}, Attraction-Surprise ${attractionSurpriseCorrelation.toFixed(3)}
- Primary Dynamic: ${primaryDynamic}
- Communication Style: ${communicationStyle}
- Session Duration: ${sessionDuration} minutes
- Response Analysis: ${responses.length} responses, avg time ${avgResponseTime.toFixed(1)}s
- Breakthrough Moments: ${breakthroughMoments.length} detected
- Language: ${language}

TOP RESPONSE INSIGHTS:
${topResponses.map(r => `- Q${r.index + 1}: "${r.questionText}" | Response: "${r.response?.substring(0, 50)}..." | Score: ${r.avgScore.toFixed(1)}/5`).join('\n')}

BREAKTHROUGH ANALYSIS:
${breakthroughMoments.map(b => `- ${b.insight} | Q: "${b.questionText}" | Response: "${b.responsePreview}"`).join('\n')}

Provide a sophisticated GetClose Intelligence 2.0 analysis in this JSON format:
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
    "volatilityProfile": "${volatility.honesty < 1 ? 'Stable' : 'Dynamic'}",
    "rarityPercentile": "${Math.min(95, Math.max(5, (bondMap.closeness + bondMap.spark + bondMap.anchor) * 6.67))}th",
    "dataPoints": ${responses.length * 4},
    "analysisDepth": "Advanced Psychological Framework"
  },
  "specificMoments": [
    ${breakthroughMoments.slice(0, 3).map(m => `{
      "questionNumber": ${m.question},
      "type": "${m.type}",
      "score": ${m.score},
      "insight": "${m.insight}",
      "significance": "${m.score >= 4.8 ? 'Exceptional' : m.score >= 4.5 ? 'High' : 'Notable'}"
    }`).join(',\n    ')}
  ],
  "responseQuotes": [
    ${topResponses.slice(0, 2).map(r => `{
      "questionIndex": ${r.index + 1},
      "questionText": "${r.questionText?.replace(/"/g, '\\"') || 'Unknown question'}",
      "responsePreview": "${r.response?.substring(0, 100).replace(/"/g, '\\"') || ''}...",
      "overallScore": ${r.avgScore.toFixed(1)},
      "breakdown": {
        "honesty": ${r.evalData.honesty},
        "attraction": ${r.evalData.attraction},
        "intimacy": ${r.evalData.intimacy},
        "surprise": ${r.evalData.surprise}
      }
    }`).join(',\n    ')}
  ],
  "advancedMetrics": {
    "honestyIntimacyCorrelation": ${honestyIntimacyCorrelation.toFixed(3)},
    "attractionSurpriseCorrelation": ${attractionSurpriseCorrelation.toFixed(3)},
    "overallVolatility": ${((volatility.honesty + volatility.attraction + volatility.intimacy + volatility.surprise) / 4).toFixed(2)},
    "averageResponseTime": ${avgResponseTime.toFixed(1)},
    "breakthroughFrequency": ${breakthroughMoments.length}
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
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
const ANALYSIS_TEMPERATURE = 0.7; // creative-but-grounded narrative
const ANALYSIS_MAX_TOKENS = 1400;
const OPENAI_TIMEOUT_MS = 45000;
const MAX_QUOTED_RESPONSE_CHARS = 180; // per-answer excerpt fed to the model
const MAX_RESPONSES_IN_PROMPT = 12;    // cap prompt size / cost

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

// Returns null (NOT zeros) when an evaluation cannot be parsed, so bad rows
// are skipped instead of silently dragging every average toward 0.
function parseEvaluation(evaluation: string): { honesty: number; attraction: number; intimacy: number; surprise: number } | null {
  try {
    const parsed = JSON.parse(evaluation);
    if (parsed && typeof parsed === 'object' &&
        typeof parsed.honesty === 'number' &&
        typeof parsed.attraction === 'number' &&
        typeof parsed.intimacy === 'number' &&
        typeof parsed.surprise === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: ANALYSIS_TEMPERATURE,
        max_tokens: ANALYSIS_MAX_TOKENS,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OpenAI returned an empty response');
    }
    return content;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`OpenAI API call timed out after ${OPENAI_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function tryParseAnalysisJson(content: string): any {
  // response_format json_object should give clean JSON, but be defensive
  let text = content;
  const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
  if (jsonMatch) text = jsonMatch[1];
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd);
  }
  return JSON.parse(text);
}

// Required narrative fields the model must produce; used to validate output.
const REQUIRED_FIELDS = ['archetype', 'shareable_insight', 'strengthAreas', 'growthAreas', 'keyInsights', 'personalizedTips', 'next_step'];

function validateAnalysis(analysis: any): string | null {
  if (!analysis || typeof analysis !== 'object') return 'not an object';
  for (const field of REQUIRED_FIELDS) {
    if (!(field in analysis)) return `missing field: ${field}`;
  }
  if (!Array.isArray(analysis.strengthAreas) || analysis.strengthAreas.length === 0) return 'strengthAreas empty';
  if (!Array.isArray(analysis.growthAreas) || analysis.growthAreas.length === 0) return 'growthAreas empty';
  if (!Array.isArray(analysis.keyInsights) || analysis.keyInsights.length === 0) return 'keyInsights empty';
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting AI analysis request...');

    const { roomId, language: requestLanguage = 'en' } = await req.json();
    console.log('Room ID:', roomId, 'Requested language:', requestLanguage);

    // ---- Input validation ------------------------------------------------
    if (typeof roomId !== 'string' || !UUID_RE.test(roomId)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid roomId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Access guard ----------------------------------------------------
    // The analysis is generated at the end of a game by either player. An
    // identified caller must be the host or a participant of the room; an
    // anonymous caller (anon key) can only target rooms in the recently
    // active window. This prevents generating (and paying OpenAI for)
    // analyses of arbitrary or historical rooms.
    const caller = await getCallerUser(req);
    const access = await checkRoomAccess(supabase, roomId, caller?.id ?? null);
    if (!access.ok) {
      console.warn(`getclose-ai-analysis: access denied for room ${roomId}: ${access.error}`);
      return new Response(JSON.stringify({ success: false, error: access.error }), {
        status: access.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // The room's own language always wins over what the client sends, so the
    // analysis reads in the language the couple actually played in.
    const language = room.selected_language || requestLanguage;

    // Fetch responses with question data
    console.log('Fetching responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('game_responses')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No responses found for this room — play a session before requesting an analysis.',
        errorCode: 'NO_RESPONSES',
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch questions data separately for better performance
    const questionIds = [...new Set(responses.map(r => r.card_id) || [])];
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

    console.log(`Found ${responses.length} responses`);

    // Calculate session statistics (invalid evaluations are skipped, not zeroed)
    let totalHonesty = 0;
    let totalAttraction = 0;
    let totalIntimacy = 0;
    let totalSurprise = 0;
    let evaluationCount = 0;
    let invalidEvaluationCount = 0;

    const honestyScores: number[] = [];
    const attractionScores: number[] = [];
    const intimacyScores: number[] = [];
    const surpriseScores: number[] = [];

    for (const response of responses) {
      if (response.evaluation) {
        const evalData = parseEvaluation(response.evaluation);
        if (!evalData) {
          invalidEvaluationCount++;
          continue;
        }
        totalHonesty += evalData.honesty;
        totalAttraction += evalData.attraction;
        totalIntimacy += evalData.intimacy;
        totalSurprise += evalData.surprise;
        evaluationCount++;

        honestyScores.push(evalData.honesty);
        attractionScores.push(evalData.attraction);
        intimacyScores.push(evalData.intimacy);
        surpriseScores.push(evalData.surprise);
      }
    }

    if (evaluationCount === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid evaluations found for this room — the analysis needs at least one evaluated answer.',
        errorCode: 'NO_EVALUATIONS',
        invalidEvaluations: invalidEvaluationCount,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate averages (1-5 scale)
    const avgScores = {
      honesty: totalHonesty / evaluationCount,
      attraction: totalAttraction / evaluationCount,
      intimacy: totalIntimacy / evaluationCount,
      surprise: totalSurprise / evaluationCount
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

    // Deterministic compatibility score: bond map average mapped to 0-100
    const compatibilityScore = Math.round(Math.min(100, Math.max(0,
      ((bondMap.closeness + bondMap.spark + bondMap.anchor) / 3) * 20
    )));
    const relationshipPhase = compatibilityScore >= 85 ? 'mastering' :
                              compatibilityScore >= 70 ? 'deepening' :
                              compatibilityScore >= 50 ? 'building' : 'exploring';

    // Enhanced analysis for premium intelligence
    const responseTimes = responses.map(r => r.response_time || 0).filter(t => t > 0);
    const avgResponseTime = responseTimes.length ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0;

    // Per-answer digest for the model — the actual Q&A material, not just stats
    const answerDigest = responses
      .filter(r => r.response)
      .slice(0, MAX_RESPONSES_IN_PROMPT)
      .map((r, index) => {
        const evalData = r.evaluation ? parseEvaluation(r.evaluation) : null;
        const questionText = questionMap[r.card_id]?.text || 'Unknown question';
        const scoreStr = evalData
          ? `H${evalData.honesty} A${evalData.attraction} I${evalData.intimacy} S${evalData.surprise}`
          : 'not evaluated';
        return `Q${index + 1}: "${questionText}"\n   Answer: "${String(r.response).substring(0, MAX_QUOTED_RESPONSE_CHARS)}"\n   Partner's rating (1-5): ${scoreStr}`;
      });

    // Specific quote extraction with question text
    const topResponses = responses
      .filter(r => r.response && r.evaluation)
      .map((r, index) => {
        const evalData = parseEvaluation(r.evaluation);
        if (!evalData) return null;
        const avgScore = (evalData.honesty + evalData.attraction + evalData.intimacy + evalData.surprise) / 4;
        const questionText = questionMap[r.card_id]?.text || 'Unknown question';
        return { index, response: r.response, avgScore, evalData, questionText, cardId: r.card_id };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    // Breakthrough moment detection with question context
    const breakthroughMoments: any[] = [];
    responses.forEach((response, index) => {
      if (response.evaluation) {
        const evalData = parseEvaluation(response.evaluation);
        if (!evalData) return;
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

    const currentLevel = room.level || 1;
    const suggestedNextLevel = compatibilityScore >= 70 ? Math.min(currentLevel + 1, 4) : currentLevel;

    // ---- Prompt: the model only writes the NARRATIVE. All numeric metrics
    // are computed deterministically above and merged into the result below.
    const systemPrompt = `You are GetClose AI, a warm, perceptive couples-connection analyst. You write like a wise, playful friend who truly listened — never clinical, never generic. You are comfortable with adult (18+) themes of desire and intimacy, and you keep things tasteful. Reply with a single valid JSON object only. Every human-readable string in your output MUST be written in this language: ${language}.`;

    const userPrompt = `A couple just finished a GetClose session (level ${currentLevel}). Analyze THEIR actual answers below and write a premium, personal analysis. Quote or paraphrase their own words where it makes an insight land. Be positive but honest — name real growth areas kindly.

SESSION METRICS (all scores 1-5):
- Bond Map: Closeness ${bondMap.closeness.toFixed(2)}, Spark ${bondMap.spark.toFixed(2)}, Anchor (trust) ${bondMap.anchor.toFixed(2)}
- Averages: Honesty ${avgScores.honesty.toFixed(2)}, Attraction ${avgScores.attraction.toFixed(2)}, Intimacy ${avgScores.intimacy.toFixed(2)}, Surprise ${avgScores.surprise.toFixed(2)}
- Volatility: H±${volatility.honesty.toFixed(2)}, A±${volatility.attraction.toFixed(2)}, I±${volatility.intimacy.toFixed(2)}, S±${volatility.surprise.toFixed(2)}
- Primary Dynamic: ${primaryDynamic} | Communication Style: ${communicationStyle}
- Compatibility score (already computed): ${compatibilityScore}/100 | Phase: ${relationshipPhase}
- Session: ${sessionDuration} min, ${responses.length} answers, avg response time ${avgResponseTime.toFixed(1)}s
- Breakthrough moments detected: ${breakthroughMoments.length}

THEIR ACTUAL QUESTIONS AND ANSWERS:
${answerDigest.join('\n')}

Return EXACTLY this JSON shape (all strings in ${language}):
{
  "archetype": "A memorable 2-4 word couple archetype name that captures THEIR specific dynamic, e.g. 'The Slow-Burn Explorers' — invent one unique to them, title-cased",
  "archetypeDescription": "1-2 sentences on why this archetype fits them, referencing their actual answers",
  "shareable_insight": "ONE quote-worthy insight about this couple, max 140 characters, written to be screenshot-shared — punchy, specific, warm",
  "relationshipPhase": "${relationshipPhase}",
  "strengthAreas": [
    { "area": "name of a strong pillar", "score": <their 1-5 avg for it>, "insight": "specific, grounded in an actual answer" }
  ],
  "growthAreas": [
    { "area": "name of the weakest pillar", "score": <their 1-5 avg for it>, "recommendation": "kind, concrete, actionable advice" }
  ],
  "keyInsights": [
    "3 insights about their communication, emotional dynamics, and connection quality — each tied to something they actually said or scored"
  ],
  "personalizedTips": [
    "3 specific, doable suggestions for their next session or their week"
  ],
  "next_step": {
    "suggestedLevel": ${suggestedNextLevel},
    "title": "short inviting name for what to try next",
    "description": "1-2 sentences: what to try in their next session and why, based on this session"
  },
  "culturalNotes": "one brief sentence of cultural/tonal context for ${language}, or an encouraging note",
  "nextSessionRecommendation": "one paragraph: the single best focus for next time"
}`;

    console.log('Calling OpenAI API...');

    // Retry once on parse/validation failure before giving up (never silent zeros)
    let analysis: any = null;
    let lastError = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const content = await callOpenAI(
          systemPrompt,
          attempt === 1 ? userPrompt : `${userPrompt}\n\nIMPORTANT: Your previous reply was not valid (${lastError}). Return ONLY the JSON object, exactly in the requested shape.`
        );
        const parsed = tryParseAnalysisJson(content);
        const validationError = validateAnalysis(parsed);
        if (validationError) {
          lastError = validationError;
          console.warn(`Attempt ${attempt}: invalid analysis (${validationError})`);
          continue;
        }
        analysis = parsed;
        break;
      } catch (err) {
        lastError = err.message;
        console.warn(`Attempt ${attempt} failed: ${err.message}`);
      }
    }

    if (!analysis) {
      return new Response(JSON.stringify({
        success: false,
        error: `The AI analysis could not be generated right now (${lastError}). Please try again.`,
        errorCode: 'AI_GENERATION_FAILED',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Merge deterministic metrics (server-computed, never hallucinated).
    // These overwrite anything the model might have produced for them, and
    // preserve the schema the frontend already reads.
    analysis.compatibilityScore = compatibilityScore;
    analysis.relationshipPhase = analysis.relationshipPhase || relationshipPhase;
    analysis.intelligenceMarkers = {
      primaryDynamic,
      communicationDNA: communicationStyle,
      volatilityProfile: volatility.honesty < 1 ? 'Stable' : 'Dynamic',
      rarityPercentile: `${Math.round(Math.min(95, Math.max(5, (bondMap.closeness + bondMap.spark + bondMap.anchor) * 6.67)))}th`,
      dataPoints: responses.length * 4,
      analysisDepth: 'Advanced Psychological Framework'
    };
    analysis.specificMoments = breakthroughMoments.slice(0, 3).map(m => ({
      questionNumber: m.question,
      type: m.type,
      score: m.score,
      insight: m.insight,
      significance: m.score >= 4.8 ? 'Exceptional' : m.score >= 4.5 ? 'High' : 'Notable'
    }));
    analysis.responseQuotes = topResponses.slice(0, 2).map(r => ({
      questionIndex: r.index + 1,
      questionText: r.questionText || 'Unknown question',
      responsePreview: (r.response?.substring(0, 100) || '') + '...',
      overallScore: Number(r.avgScore.toFixed(1)),
      breakdown: {
        honesty: r.evalData.honesty,
        attraction: r.evalData.attraction,
        intimacy: r.evalData.intimacy,
        surprise: r.evalData.surprise
      }
    }));
    analysis.advancedMetrics = {
      honestyIntimacyCorrelation: Number(honestyIntimacyCorrelation.toFixed(3)),
      attractionSurpriseCorrelation: Number(attractionSurpriseCorrelation.toFixed(3)),
      overallVolatility: Number(((volatility.honesty + volatility.attraction + volatility.intimacy + volatility.surprise) / 4).toFixed(2)),
      averageResponseTime: Number(avgResponseTime.toFixed(1)),
      breakthroughFrequency: breakthroughMoments.length
    };

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
          valid_evaluations: evaluationCount,
          invalid_evaluations: invalidEvaluationCount,
          session_duration: sessionDuration,
          language
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

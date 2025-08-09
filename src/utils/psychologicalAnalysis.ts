import { GameResponse } from './connectionAlgorithm';

export interface PillarScores {
  honesty: number;
  attraction: number;
  intimacy: number;
  surprise: number;
}

export interface BondMap {
  closeness: number; // intimacy-based with stability adjustment
  spark: number; // attraction + surprise combination
  anchor: number; // honesty as trust/commitment proxy
}

export interface PsychologicalMetrics {
  bondMap: BondMap;
  volatility: {
    honesty: number;
    attraction: number;
    intimacy: number;
    surprise: number;
    overall: number;
  };
  correlations: {
    honestyIntimacy: number;
    attractionSurprise: number;
    overallStability: number;
  };
  progression: {
    trend: 'rising' | 'stable' | 'declining';
    momentum: number;
    peaks: number[];
    consistency: number;
  };
  highlights: {
    breakthroughMoments: Array<{
      questionIndex: number;
      type: 'honesty_surge' | 'intimacy_peak' | 'attraction_spark' | 'surprise_moment';
      significance: number;
      insight: string;
    }>;
    patterns: Array<{
      type: 'communication_flow' | 'vulnerability_cycle' | 'excitement_rhythm';
      description: string;
      strength: number;
    }>;
  };
}

export interface IntelligenceInsights {
  primaryDynamic: string;
  communicationDNA: {
    style: 'Validating' | 'Adventurous' | 'Deep' | 'Playful' | 'Balanced';
    strength: number;
    description: string;
  };
  relationshipVelocity: {
    speed: 'Slow & Steady' | 'Moderate Pace' | 'Fast Track' | 'Variable';
    direction: 'Deepening' | 'Exploring' | 'Stabilizing' | 'Accelerating';
  };
  uniqueStrengths: string[];
  intelligentRecommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'communication' | 'intimacy' | 'adventure' | 'trust';
    action: string;
    reasoning: string;
    timeframe: string;
  }>;
  rarityMetrics: {
    topPercentile: number; // What percentile they're in
    uniqueTraits: string[];
    comparisonNote: string;
  };
}

// Statistical helpers
const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const calculateCorrelation = (x: number[], y: number[]): number => {
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
};

const calculateTrend = (values: number[]): { trend: 'rising' | 'stable' | 'declining'; momentum: number } => {
  if (values.length < 2) return { trend: 'stable', momentum: 0 };
  
  const first = values.slice(0, Math.ceil(values.length / 3)).reduce((sum, val) => sum + val, 0) / Math.ceil(values.length / 3);
  const last = values.slice(-Math.ceil(values.length / 3)).reduce((sum, val) => sum + val, 0) / Math.ceil(values.length / 3);
  
  const momentum = (last - first) / first;
  
  if (momentum > 0.1) return { trend: 'rising', momentum };
  if (momentum < -0.1) return { trend: 'declining', momentum };
  return { trend: 'stable', momentum };
};

export const calculatePsychologicalMetrics = (responses: GameResponse[]): PsychologicalMetrics => {
  const evaluatedResponses = responses.filter(r => r.evaluation);
  
  if (evaluatedResponses.length === 0) {
    // Return default metrics for no evaluations
    return {
      bondMap: { closeness: 0, spark: 0, anchor: 0 },
      volatility: { honesty: 0, attraction: 0, intimacy: 0, surprise: 0, overall: 0 },
      correlations: { honestyIntimacy: 0, attractionSurprise: 0, overallStability: 0 },
      progression: { trend: 'stable', momentum: 0, peaks: [], consistency: 0 },
      highlights: { breakthroughMoments: [], patterns: [] }
    };
  }

  // Extract pillar scores
  const honestyScores = evaluatedResponses.map(r => r.evaluation!.honesty);
  const attractionScores = evaluatedResponses.map(r => r.evaluation!.attraction);
  const intimacyScores = evaluatedResponses.map(r => r.evaluation!.intimacy);
  const surpriseScores = evaluatedResponses.map(r => r.evaluation!.surprise);

  // Calculate Bond Map (Triangular Theory of Love implementation)
  const avgIntimacy = intimacyScores.reduce((sum, val) => sum + val, 0) / intimacyScores.length;
  const intimacyStability = 1 - (calculateStandardDeviation(intimacyScores) / 5); // Normalize to 0-1
  const closeness = avgIntimacy * intimacyStability; // Adjusted intimacy

  const avgAttraction = attractionScores.reduce((sum, val) => sum + val, 0) / attractionScores.length;
  const avgSurprise = surpriseScores.reduce((sum, val) => sum + val, 0) / surpriseScores.length;
  const spark = (avgAttraction + avgSurprise) / 2; // Passion component

  const avgHonesty = honestyScores.reduce((sum, val) => sum + val, 0) / honestyScores.length;
  const anchor = avgHonesty; // Commitment/trust proxy

  // Calculate volatility
  const volatility = {
    honesty: calculateStandardDeviation(honestyScores),
    attraction: calculateStandardDeviation(attractionScores),
    intimacy: calculateStandardDeviation(intimacyScores),
    surprise: calculateStandardDeviation(surpriseScores),
    overall: calculateStandardDeviation([...honestyScores, ...attractionScores, ...intimacyScores, ...surpriseScores])
  };

  // Calculate correlations (Social Penetration Theory)
  const correlations = {
    honestyIntimacy: calculateCorrelation(honestyScores, intimacyScores),
    attractionSurprise: calculateCorrelation(attractionScores, surpriseScores),
    overallStability: 1 - (volatility.overall / 2.5) // Normalize
  };

  // Calculate progression trends
  const overallScores = evaluatedResponses.map(r => 
    (r.evaluation!.honesty + r.evaluation!.attraction + r.evaluation!.intimacy + r.evaluation!.surprise) / 4
  );
  const progression = {
    ...calculateTrend(overallScores),
    peaks: overallScores.map((score, index) => ({ score, index }))
      .filter(item => item.score >= Math.max(...overallScores) * 0.9)
      .map(item => item.index),
    consistency: 1 - (calculateStandardDeviation(overallScores) / 2.5)
  };

  // Detect breakthrough moments and patterns
  const highlights = {
    breakthroughMoments: [] as Array<{
      questionIndex: number;
      type: 'honesty_surge' | 'intimacy_peak' | 'attraction_spark' | 'surprise_moment';
      significance: number;
      insight: string;
    }>,
    patterns: [] as Array<{
      type: 'communication_flow' | 'vulnerability_cycle' | 'excitement_rhythm';
      description: string;
      strength: number;
    }>
  };

  // Detect breakthrough moments
  evaluatedResponses.forEach((response, index) => {
    const evalData = response.evaluation!;
    
    // Honesty surge detection
    if (evalData.honesty >= 4.5 && (index === 0 || evalData.honesty > evaluatedResponses[index - 1].evaluation!.honesty + 1)) {
      highlights.breakthroughMoments.push({
        questionIndex: index,
        type: 'honesty_surge',
        significance: evalData.honesty / 5,
        insight: 'Significant trust breakthrough detected'
      });
    }
    
    // Intimacy peak detection
    if (evalData.intimacy >= 4.5) {
      highlights.breakthroughMoments.push({
        questionIndex: index,
        type: 'intimacy_peak',
        significance: evalData.intimacy / 5,
        insight: 'Deep emotional connection moment'
      });
    }
    
    // Attraction spark detection
    if (evalData.attraction >= 4.5) {
      highlights.breakthroughMoments.push({
        questionIndex: index,
        type: 'attraction_spark',
        significance: evalData.attraction / 5,
        insight: 'Strong attraction indicator'
      });
    }
    
    // Surprise moment detection
    if (evalData.surprise >= 4.5) {
      highlights.breakthroughMoments.push({
        questionIndex: index,
        type: 'surprise_moment',
        significance: evalData.surprise / 5,
        insight: 'Unexpected revelation or novelty'
      });
    }
  });

  // Detect communication patterns
  if (correlations.honestyIntimacy > 0.7) {
    highlights.patterns.push({
      type: 'communication_flow',
      description: 'Strong honesty-intimacy correlation indicates healthy communication flow',
      strength: correlations.honestyIntimacy
    });
  }

  if (volatility.overall < 1.0) {
    highlights.patterns.push({
      type: 'vulnerability_cycle',
      description: 'Consistent emotional responses suggest stable vulnerability patterns',
      strength: 1 - volatility.overall / 2.5
    });
  }

  if (correlations.attractionSurprise > 0.6) {
    highlights.patterns.push({
      type: 'excitement_rhythm',
      description: 'Attraction and surprise alignment indicates synchronized excitement',
      strength: correlations.attractionSurprise
    });
  }

  return {
    bondMap: { closeness, spark, anchor },
    volatility,
    correlations,
    progression,
    highlights
  };
};

export const generateIntelligenceInsights = (
  metrics: PsychologicalMetrics,
  responses: GameResponse[]
): IntelligenceInsights => {
  const { bondMap, volatility, correlations, progression } = metrics;

  // Determine primary dynamic
  const primaryDynamic = bondMap.closeness > 3.5 ? 'Intimacy-Driven' :
                        bondMap.spark > 3.5 ? 'Passion-Driven' :
                        bondMap.anchor > 3.5 ? 'Trust-Driven' : 'Exploratory';

  // Determine communication DNA
  let communicationDNA: IntelligenceInsights['communicationDNA'];
  
  if (correlations.honestyIntimacy > 0.7 && volatility.overall < 1.0) {
    communicationDNA = {
      style: 'Validating',
      strength: correlations.honestyIntimacy,
      description: 'Your communication creates safe spaces for deep sharing'
    };
  } else if (bondMap.spark > 4.0 && correlations.attractionSurprise > 0.6) {
    communicationDNA = {
      style: 'Adventurous',
      strength: bondMap.spark / 5,
      description: 'You thrive on excitement and novel experiences together'
    };
  } else if (bondMap.closeness > 4.0) {
    communicationDNA = {
      style: 'Deep',
      strength: bondMap.closeness / 5,
      description: 'You naturally gravitate toward profound emotional connection'
    };
  } else if (metrics.highlights.breakthroughMoments.filter(m => m.type === 'surprise_moment').length > 2) {
    communicationDNA = {
      style: 'Playful',
      strength: 0.8,
      description: 'You excel at keeping things light and discovering new aspects'
    };
  } else {
    communicationDNA = {
      style: 'Balanced',
      strength: (bondMap.closeness + bondMap.spark + bondMap.anchor) / 15,
      description: 'You maintain a healthy balance across all connection dimensions'
    };
  }

  // Determine relationship velocity
  const relationshipVelocity: IntelligenceInsights['relationshipVelocity'] = {
    speed: progression.momentum > 0.2 ? 'Fast Track' :
           progression.momentum > 0.1 ? 'Moderate Pace' :
           progression.momentum < -0.1 ? 'Variable' : 'Slow & Steady',
    direction: progression.trend === 'rising' ? 'Accelerating' :
               bondMap.closeness > bondMap.spark ? 'Deepening' :
               bondMap.spark > bondMap.anchor ? 'Exploring' : 'Stabilizing'
  };

  // Generate unique strengths
  const uniqueStrengths: string[] = [];
  
  if (bondMap.anchor > 4.0) uniqueStrengths.push('Exceptional trust foundation');
  if (volatility.overall < 0.5) uniqueStrengths.push('Remarkable emotional consistency');
  if (correlations.honestyIntimacy > 0.8) uniqueStrengths.push('Synchronized vulnerability');
  if (progression.consistency > 0.8) uniqueStrengths.push('Steady relationship momentum');
  if (metrics.highlights.breakthroughMoments.length > 3) uniqueStrengths.push('High breakthrough frequency');

  // Generate intelligent recommendations
  const intelligentRecommendations: IntelligenceInsights['intelligentRecommendations'] = [];

  // EFT-based recommendations
  if (correlations.honestyIntimacy < 0.3) {
    intelligentRecommendations.push({
      priority: 'high',
      category: 'communication',
      action: 'Practice validation before vulnerability',
      reasoning: 'Low honesty-intimacy correlation suggests need for safety before sharing',
      timeframe: 'Next 2 weeks'
    });
  }

  // Self-Expansion Model recommendations
  if (volatility.surprise > 2.0 && bondMap.spark < 3.0) {
    intelligentRecommendations.push({
      priority: 'medium',
      category: 'adventure',
      action: 'Establish weekly novelty rituals',
      reasoning: 'High surprise volatility indicates need for structured novelty',
      timeframe: 'Starting this week'
    });
  }

  // Gottman-based recommendations
  if (bondMap.anchor > 4.0 && volatility.honesty > 1.5) {
    intelligentRecommendations.push({
      priority: 'low',
      category: 'trust',
      action: 'Weekly trust check-ins',
      reasoning: 'High trust with volatility suggests need for stability rituals',
      timeframe: 'Ongoing practice'
    });
  }

  // Calculate rarity metrics
  const overallScore = (bondMap.closeness + bondMap.spark + bondMap.anchor) / 3;
  const topPercentile = Math.min(95, Math.max(5, overallScore * 20)); // Rough percentile
  
  const uniqueTraits: string[] = [];
  if (correlations.honestyIntimacy > 0.8) uniqueTraits.push('Exceptional emotional synchronization');
  if (volatility.overall < 0.5) uniqueTraits.push('Rare emotional stability');
  if (progression.momentum > 0.3) uniqueTraits.push('Accelerated relationship growth');

  const comparisonNote = topPercentile > 80 ? 
    `You're in the top ${100 - topPercentile}% of couples we've analyzed` :
    topPercentile > 60 ?
    `You're performing above average compared to similar couples` :
    `You're building a strong foundation with room for growth`;

  return {
    primaryDynamic,
    communicationDNA,
    relationshipVelocity,
    uniqueStrengths,
    intelligentRecommendations,
    rarityMetrics: {
      topPercentile,
      uniqueTraits,
      comparisonNote
    }
  };
};
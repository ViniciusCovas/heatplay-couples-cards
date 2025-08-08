import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  category: 'performance' | 'consistency' | 'growth' | 'special';
}

export interface ResponseTimeAnalytics {
  userAverage: number;
  globalMedian: number;
  percentile: number;
  mindfulnessScore: number;
  thoughtfulnessIndex: number;
  optimalRange: [number, number];
  consistency: number;
  // optional sample sizes for transparency
  globalSampleSize?: number;
  userSampleSize?: number;
}

export interface PeerComparison {
  dimension: string;
  userScore: number;
  peerAverage: number;
  percentile: number;
  rank: string;
}

export interface GrowthMetrics {
  velocityScore: number;
  trend: 'improving' | 'stable' | 'declining';
  breakthroughMoments: number;
  plateauRisk: number;
  nextMilestone: string;
}

export interface AdvancedInsightsData {
  achievements: AchievementData[];
  responseTimeAnalytics: ResponseTimeAnalytics;
  peerComparisons: PeerComparison[];
  growthMetrics: GrowthMetrics;
  relationshipXP: number;
  currentLevel: number;
  streakDays: number;
  totalSessions: number;
}

export const useAdvancedInsights = (roomCode: string) => {
  return useQuery({
    queryKey: ['advanced-insights', roomCode],
    queryFn: async (): Promise<AdvancedInsightsData | null> => {
      if (!roomCode) return null;

      // Get room and session data
      const { data: room } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (!room) return null;

      // Get responses for analytics
      const { data: responses } = await supabase
        .from('game_responses')
        .select('*')
        .eq('room_id', room.id);

      // Get AI analysis
      const { data: analysis } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('room_id', room.id)
        .eq('analysis_type', 'getclose-ai-analysis')
        .order('created_at', { ascending: false })
        .limit(1);

      // Get global benchmarks for comparison
      const [{ data: allAnalyses }, { data: allResponses }] = await Promise.all([
        supabase
          .from('ai_analyses')
          .select('ai_response')
          .eq('analysis_type', 'getclose-ai-analysis'),
        supabase
          .from('game_responses')
          .select('response_time')
          .not('response_time', 'is', null),
      ]);

      const aiResponse = analysis?.[0]?.ai_response as any;
      const userResponses = responses || [];
      const globalAnalyses = allAnalyses || [];
      const globalResponses = allResponses || [];

      // Calculate achievements
      const achievements = calculateAchievements(userResponses, aiResponse);
      
      // Calculate response time analytics (now using real global data)
      const responseTimeAnalytics = calculateResponseTimeAnalytics(userResponses, globalResponses);
      
      // Calculate peer comparisons (now using real global analyses)
      const peerComparisons = calculatePeerComparisons(aiResponse, globalAnalyses);
      
      // Calculate growth metrics
      const growthMetrics = calculateGrowthMetrics(userResponses, aiResponse);

      return {
        achievements,
        responseTimeAnalytics,
        peerComparisons,
        growthMetrics,
        relationshipXP: calculateXP(userResponses, aiResponse),
        currentLevel: calculateLevel(userResponses.length, aiResponse?.compatibilityScore || 0),
        streakDays: 1, // Would need session history
        totalSessions: 1, // Would need session history
      };
    },
    enabled: !!roomCode,
    retry: false,
  });
};

function calculateAchievements(responses: any[], aiResponse: any): AchievementData[] {
  const achievements: AchievementData[] = [];

  // Speed achievements
  const avgResponseTime = responses.reduce((sum, r) => sum + (r.response_time || 0), 0) / responses.length;
  if (avgResponseTime < 30000) { // Under 30 seconds
    achievements.push({
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Average response time under 30 seconds',
      icon: 'Zap',
      tier: 'gold',
      unlocked: true,
      progress: 100,
      maxProgress: 100,
      category: 'performance',
    });
  }

  // Honesty achievements
  const honestyScores = responses.map(r => {
    const evaluation = r.evaluation ? JSON.parse(r.evaluation) : null;
    return evaluation?.honesty || 0;
  }).filter(s => s > 0);
  
  const avgHonesty = honestyScores.length > 0 
    ? honestyScores.reduce((sum, s) => sum + s, 0) / honestyScores.length 
    : 0;

  if (avgHonesty >= 4.5) {
    achievements.push({
      id: 'truth-teller',
      name: 'Truth Teller',
      description: 'Consistently high honesty scores',
      icon: 'Shield',
      tier: 'platinum',
      unlocked: true,
      progress: 100,
      maxProgress: 100,
      category: 'performance',
    });
  }

  // Completion achievements
  if (responses.length >= 10) {
    achievements.push({
      id: 'questionnaire-master',
      name: 'Questionnaire Master',
      description: 'Completed 10+ questions in a session',
      icon: 'Award',
      tier: 'silver',
      unlocked: true,
      progress: 100,
      maxProgress: 100,
      category: 'consistency',
    });
  }

  // Compatibility achievements
  const compatibilityScore = aiResponse?.compatibilityScore || 0;
  if (compatibilityScore >= 80) {
    achievements.push({
      id: 'perfect-match',
      name: 'Perfect Match',
      description: 'Compatibility score of 80+',
      icon: 'Heart',
      tier: 'platinum',
      unlocked: true,
      progress: 100,
      maxProgress: 100,
      category: 'special',
    });
  }

  return achievements;
}

function calculateResponseTimeAnalytics(userResponses: any[], globalResponses: any[]): ResponseTimeAnalytics {
  const userTimes = userResponses.map(r => r.response_time || 0).filter((t: number) => t > 0);
  const userAverage = userTimes.length > 0 
    ? userTimes.reduce((sum: number, t: number) => sum + t, 0) / userTimes.length 
    : 0;

  // Build global list from real response times
  const globalTimes = (globalResponses || [])
    .map((r: any) => r.response_time || 0)
    .filter((t: number) => t > 0)
    .sort((a: number, b: number) => a - b);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 45000; // fallback 45s
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
  };

  const globalMedian = median(globalTimes);

  // Percentile: faster averages rank higher (lower time = higher percentile)
  let percentile = 50;
  if (globalTimes.length > 0 && userAverage > 0) {
    const idx = globalTimes.findIndex((t: number) => t >= userAverage);
    const position = idx === -1 ? globalTimes.length - 1 : idx;
    const pct = 1 - position / Math.max(globalTimes.length - 1, 1);
    percentile = Math.max(1, Math.min(99, Math.round(pct * 100)));
  }

  // Mindfulness score: balance vs global median (closer to median -> higher)
  const diffRatio = globalMedian > 0 ? Math.abs(userAverage - globalMedian) / globalMedian : 0;
  const mindfulnessScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(diffRatio, 1)) * 100)));

  // Thoughtfulness index: optimal window 20-60s
  const optimalRange: [number, number] = [20000, 60000];
  const thoughtfulnessIndex = userAverage >= optimalRange[0] && userAverage <= optimalRange[1] ? 85 : 60;

  // Consistency: standard deviation relative to mean
  const variance = userTimes.length > 1 
    ? userTimes.reduce((sum: number, t: number) => sum + Math.pow(t - userAverage, 2), 0) / userTimes.length
    : 0;
  const consistency = userAverage > 0 ? Math.max(0, Math.min(100, (1 - Math.sqrt(variance) / userAverage) * 100)) : 0;

  return {
    userAverage,
    globalMedian,
    percentile,
    mindfulnessScore,
    thoughtfulnessIndex,
    optimalRange,
    consistency,
  };
}

function calculatePeerComparisons(aiResponse: any, globalAnalyses: any[]): PeerComparison[] {
  const comparisons: PeerComparison[] = [];
  if (!aiResponse?.strengthAreas) return comparisons;

  // Build real global averages from AI analyses
  const areaTotals: Record<string, { sum: number; count: number }> = {};
  (globalAnalyses || []).forEach((row: any) => {
    const resp = row?.ai_response;
    const areas = resp?.strengthAreas as Array<{ area: string; score: number }> | undefined;
    if (!areas) return;
    areas.forEach(({ area, score }) => {
      if (!areaTotals[area]) areaTotals[area] = { sum: 0, count: 0 };
      areaTotals[area].sum += Number(score) || 0;
      areaTotals[area].count += 1;
    });
  });

  aiResponse.strengthAreas.forEach((area: any) => {
    const stats = areaTotals[area.area] || { sum: 3, count: 1 };
    const peerAverage = stats.sum / Math.max(stats.count, 1);
    const userScore = Number(area.score) || 0;

    // Simple percentile vs average proxy
    const percentile = userScore > peerAverage ? 75 : 25;
    let rank = 'Average';
    if (percentile >= 90) rank = 'Top 10%';
    else if (percentile >= 75) rank = 'Top 25%';
    else if (percentile >= 50) rank = 'Above Average';
    else if (percentile >= 25) rank = 'Below Average';
    else rank = 'Bottom 25%';

    comparisons.push({
      dimension: area.area,
      userScore,
      peerAverage,
      percentile,
      rank,
    });
  });

  return comparisons;
}

function calculateGrowthMetrics(responses: any[], aiResponse: any): GrowthMetrics {
  // Simplified growth calculations - would be more sophisticated with historical data
  const compatibilityScore = aiResponse?.compatibilityScore || 0;
  
  return {
    velocityScore: Math.min(100, compatibilityScore + 10), // Projected growth
    trend: compatibilityScore >= 70 ? 'improving' : 'stable',
    breakthroughMoments: responses.length >= 10 ? 1 : 0,
    plateauRisk: compatibilityScore < 50 ? 30 : 10,
    nextMilestone: compatibilityScore < 70 ? 'Reach 70% compatibility' : 'Maintain high performance',
  };
}

function calculateXP(responses: any[], aiResponse: any): number {
  const baseXP = responses.length * 10; // 10 XP per response
  const compatibilityBonus = Math.floor((aiResponse?.compatibilityScore || 0) / 10) * 5;
  const completionBonus = responses.length >= 10 ? 50 : 0;
  
  return baseXP + compatibilityBonus + completionBonus;
}

function calculateLevel(responseCount: number, compatibilityScore: number): number {
  const baseLevel = Math.floor(responseCount / 5); // Level up every 5 responses
  const bonusLevel = Math.floor(compatibilityScore / 25); // Bonus levels for high compatibility
  
  return Math.max(1, Math.min(10, baseLevel + bonusLevel));
}
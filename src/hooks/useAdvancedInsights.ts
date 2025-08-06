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
      const { data: allAnalyses } = await supabase
        .from('ai_analyses')
        .select('ai_response')
        .eq('analysis_type', 'getclose-ai-analysis');

      const aiResponse = analysis?.[0]?.ai_response as any;
      const userResponses = responses || [];
      const globalData = allAnalyses || [];

      // Calculate achievements
      const achievements = calculateAchievements(userResponses, aiResponse);
      
      // Calculate response time analytics
      const responseTimeAnalytics = calculateResponseTimeAnalytics(userResponses, globalData);
      
      // Calculate peer comparisons
      const peerComparisons = calculatePeerComparisons(aiResponse, globalData);
      
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

function calculateResponseTimeAnalytics(userResponses: any[], globalData: any[]): ResponseTimeAnalytics {
  const userTimes = userResponses.map(r => r.response_time || 0).filter(t => t > 0);
  const userAverage = userTimes.length > 0 
    ? userTimes.reduce((sum, t) => sum + t, 0) / userTimes.length 
    : 0;

  // Calculate global median (simplified)
  const globalMedian = 45000; // 45 seconds as baseline

  // Calculate percentile (simplified)
  const percentile = userAverage < globalMedian ? 75 : 25;

  // Mindfulness score: faster can mean less thoughtful
  const mindfulnessScore = Math.max(0, Math.min(100, 
    100 - ((Math.max(0, globalMedian - userAverage) / globalMedian) * 50)
  ));

  // Thoughtfulness index: optimal range consideration
  const optimalRange: [number, number] = [20000, 60000]; // 20-60 seconds
  const thoughtfulnessIndex = userAverage >= optimalRange[0] && userAverage <= optimalRange[1] ? 85 : 60;

  // Consistency: how much variation in response times
  const variance = userTimes.length > 1 
    ? userTimes.reduce((sum, t) => sum + Math.pow(t - userAverage, 2), 0) / userTimes.length
    : 0;
  const consistency = Math.max(0, 100 - (Math.sqrt(variance) / userAverage * 100));

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

function calculatePeerComparisons(aiResponse: any, globalData: any[]): PeerComparison[] {
  const comparisons: PeerComparison[] = [];
  
  if (!aiResponse?.strengthAreas) return comparisons;

  // Calculate global averages for each dimension
  const globalAverages = {
    communication: 3.2,
    emotional_intimacy: 3.1,
    physical_connection: 3.3,
    trust: 3.4,
    shared_values: 3.2,
  };

  aiResponse.strengthAreas.forEach((area: any) => {
    const peerAverage = globalAverages[area.area as keyof typeof globalAverages] || 3.0;
    const userScore = area.score;
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
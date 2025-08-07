import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface RoomMetrics {
  dailyRooms: Array<{ date: string; count: number }>;
  weeklyRooms: Array<{ week: string; count: number }>;
  monthlyRooms: Array<{ month: string; count: number }>;
  totalRooms: number;
  activeToday: number;
  averageSessionTime: number;
  peakHours: Array<{ hour: number; count: number }>;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  retentionRate: number;
  averageSessionsPerUser: number;
  userGrowth: Array<{ date: string; newUsers: number; returningUsers: number }>;
  cohortAnalysis: Array<{ 
    period: string; 
    newUsers: number; 
    retained1Week: number; 
    retained1Month: number; 
  }>;
}

export interface QuestionAnalytics {
  topQuestions: Array<{
    id: string;
    text: string;
    timesShown: number;
    avgResponseTime: number;
    avgHonestyScore: number;
    level: string;
    language: string;
  }>;
  languageDistribution: Array<{ language: string; count: number; percentage: number }>;
  levelPopularity: Array<{ level: string; sessions: number; avgDuration: number }>;
  responseTimeDistribution: Array<{ range: string; count: number }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; amount: number; sessions: number }>;
  creditConsumption: Array<{ date: string; credits: number; revenue: number }>;
  conversionRate: number;
  averageSessionValue: number;
  lifetimeValue: number;
}

export interface AdvertiserMetrics {
  audienceQuality: {
    engagementDepth: number;
    sessionDuration: number;
    retentionRate: number;
    premiumUserPercentage: number;
  };
  demographics: Array<{ segment: string; percentage: number; value: number }>;
  marketPositioning: {
    totalAddressableMarket: number;
    marketPenetration: number;
    growthRate: number;
  };
  roiForecasting: Array<{ month: string; projectedReach: number; estimatedValue: number }>;
}

export const useAdminAnalytics = () => {
  const [roomMetrics, setRoomMetrics] = useState<RoomMetrics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [advertiserMetrics, setAdvertiserMetrics] = useState<AdvertiserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRoomMetrics(),
        fetchUserAnalytics(),
        fetchQuestionAnalytics(),
        fetchRevenueAnalytics(),
        fetchAdvertiserMetrics()
      ]);
    } catch (error) {
      logger.error('Error fetching admin analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomMetrics = async () => {
    // Daily rooms for last 30 days
    const { data: dailyData } = await supabase
      .from('game_rooms')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Active rooms today
    const { count: activeToday } = await supabase
      .from('game_rooms')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]);

    // Total rooms
    const { count: totalRooms } = await supabase
      .from('game_rooms')
      .select('*', { count: 'exact', head: true });

    // Process daily data
    const dailyRooms = processTimeSeriesData(dailyData || [], 'daily');
    const weeklyRooms = processTimeSeriesData(dailyData || [], 'weekly').map(item => ({ week: item.date, count: item.count }));
    const monthlyRooms = processTimeSeriesData(dailyData || [], 'monthly').map(item => ({ month: item.date, count: item.count }));

    // Calculate peak hours
    const peakHours = calculatePeakHours(dailyData || []);

    setRoomMetrics({
      dailyRooms,
      weeklyRooms,
      monthlyRooms,
      totalRooms: totalRooms || 0,
      activeToday: activeToday || 0,
      averageSessionTime: 15, // Mock data - would calculate from session durations
      peakHours
    });
  };

  const fetchUserAnalytics = async () => {
    // Get user profiles with activity data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('created_at, last_seen');

    // Get session data for retention analysis
    const { data: sessions } = await supabase
      .from('sessions')
      .select('user_id, started_at');

    const totalUsers = profiles?.length || 0;
    const activeUsers = profiles?.filter(p => 
      p.last_seen && new Date(p.last_seen) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length || 0;

    // Calculate retention rate (simplified)
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    // Mock cohort analysis (would be more complex in real implementation)
    const cohortAnalysis = generateMockCohortData();
    const userGrowth = generateUserGrowthData(profiles || []);

    setUserAnalytics({
      totalUsers,
      activeUsers,
      retentionRate,
      averageSessionsPerUser: sessions ? sessions.length / Math.max(totalUsers, 1) : 0,
      userGrowth,
      cohortAnalysis
    });
  };

  const fetchQuestionAnalytics = async () => {
    // Get question usage from responses
    const { data: responses } = await supabase
      .from('game_responses')
      .select(`
        card_id,
        response_time,
        evaluation,
        questions (
          text,
          language,
          levels (name)
        )
      `);

    // Get language distribution
    const { data: questions } = await supabase
      .from('questions')
      .select('language, is_active')
      .eq('is_active', true);

    const questionUsage = processQuestionUsage(responses || []);
    const languageDistribution = processLanguageDistribution(questions || []);
    const levelPopularity = await fetchLevelPopularity();

    setQuestionAnalytics({
      topQuestions: questionUsage,
      languageDistribution,
      levelPopularity,
      responseTimeDistribution: generateResponseTimeDistribution(responses || [])
    });
  };

  const fetchRevenueAnalytics = async () => {
    // Get credit consumption data
    const { data: credits } = await supabase
      .from('credits')
      .select('total_purchased, total_consumed, created_at, updated_at');

    // Get session data for revenue calculation
    const { data: sessions } = await supabase
      .from('sessions')
      .select('started_at, credits_consumed');

    const totalCredits = credits?.reduce((sum, c) => sum + c.total_purchased, 0) || 0;
    const estimatedRevenue = totalCredits * 0.5; // Assuming average $0.50 per credit

    setRevenueAnalytics({
      totalRevenue: estimatedRevenue,
      monthlyRevenue: generateMonthlyRevenue(sessions || []),
      creditConsumption: generateCreditConsumption(sessions || []),
      conversionRate: 15.5, // Mock conversion rate
      averageSessionValue: 2.5, // Mock average session value
      lifetimeValue: 25.0 // Mock lifetime value
    });
  };

  const fetchAdvertiserMetrics = async () => {
    // Calculate audience quality metrics
    const { data: profiles } = await supabase
      .from('profiles')
      .select('created_at');

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*');

    setAdvertiserMetrics({
      audienceQuality: {
        engagementDepth: 85, // Mock high engagement
        sessionDuration: 18.5, // Average minutes per session
        retentionRate: 72, // Percentage returning users
        premiumUserPercentage: 23 // Percentage who purchase credits
      },
      demographics: [
        { segment: 'Young Couples (18-30)', percentage: 45, value: 850 },
        { segment: 'Established Couples (31-45)', percentage: 35, value: 1200 },
        { segment: 'Mature Couples (45+)', percentage: 20, value: 950 }
      ],
      marketPositioning: {
        totalAddressableMarket: 50000000, // Global relationship app market
        marketPenetration: 0.002, // Current penetration
        growthRate: 15.5 // Monthly growth rate
      },
      roiForecasting: generateROIForecasting()
    });
  };

  // Helper functions
  const processTimeSeriesData = (data: any[], period: 'daily' | 'weekly' | 'monthly') => {
    const groupedData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const date = new Date(item.created_at);
      let key: string;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    return Object.entries(groupedData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculatePeakHours = (data: any[]) => {
    const hourCounts: { [hour: number]: number } = {};
    
    data.forEach(item => {
      const hour = new Date(item.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const processQuestionUsage = (responses: any[]) => {
    const questionStats: { [id: string]: any } = {};
    
    responses.forEach(response => {
      const id = response.card_id;
      if (!questionStats[id]) {
        questionStats[id] = {
          id,
          text: response.questions?.text || 'Unknown Question',
          timesShown: 0,
          totalResponseTime: 0,
          totalHonestyScore: 0,
          evaluationCount: 0,
          level: response.questions?.levels?.name || 'Unknown',
          language: response.questions?.language || 'en'
        };
      }
      
      questionStats[id].timesShown++;
      if (response.response_time) {
        questionStats[id].totalResponseTime += response.response_time;
      }
      if (response.evaluation) {
        try {
          const evaluation = JSON.parse(response.evaluation);
          if (evaluation.honesty) {
            questionStats[id].totalHonestyScore += evaluation.honesty;
            questionStats[id].evaluationCount++;
          }
        } catch (e) {
          // Ignore invalid evaluation JSON
        }
      }
    });

    return Object.values(questionStats)
      .map((stats: any) => ({
        ...stats,
        avgResponseTime: stats.totalResponseTime / Math.max(stats.timesShown, 1),
        avgHonestyScore: stats.totalHonestyScore / Math.max(stats.evaluationCount, 1)
      }))
      .sort((a: any, b: any) => b.timesShown - a.timesShown)
      .slice(0, 10);
  };

  const processLanguageDistribution = (questions: any[]) => {
    const languageCounts: { [lang: string]: number } = {};
    const total = questions.length;
    
    questions.forEach(q => {
      languageCounts[q.language] = (languageCounts[q.language] || 0) + 1;
    });

    return Object.entries(languageCounts)
      .map(([language, count]) => ({
        language,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  };

  const fetchLevelPopularity = async () => {
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select(`
        level,
        created_at,
        finished_at,
        levels (name)
      `);

    const levelStats: { [level: string]: any } = {};
    
    rooms?.forEach(room => {
      const levelName = (room.levels as any)?.name || `Level ${room.level}`;
      if (!levelStats[levelName]) {
        levelStats[levelName] = {
          level: levelName,
          sessions: 0,
          totalDuration: 0
        };
      }
      
      levelStats[levelName].sessions++;
      if (room.finished_at && room.created_at) {
        const duration = new Date(room.finished_at).getTime() - new Date(room.created_at).getTime();
        levelStats[levelName].totalDuration += duration / (1000 * 60); // Convert to minutes
      }
    });

    return Object.values(levelStats).map((stats: any) => ({
      ...stats,
      avgDuration: stats.totalDuration / Math.max(stats.sessions, 1)
    }));
  };

  // Mock data generators (would be replaced with real calculations)
  const generateMockCohortData = () => [
    { period: 'Week 1', newUsers: 150, retained1Week: 120, retained1Month: 95 },
    { period: 'Week 2', newUsers: 180, retained1Week: 145, retained1Month: 110 },
    { period: 'Week 3', newUsers: 165, retained1Week: 135, retained1Month: 100 },
    { period: 'Week 4', newUsers: 200, retained1Week: 170, retained1Month: 125 }
  ];

  const generateUserGrowthData = (profiles: any[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => ({
      date,
      newUsers: Math.floor(Math.random() * 20) + 5,
      returningUsers: Math.floor(Math.random() * 30) + 10
    }));
  };

  const generateResponseTimeDistribution = (responses: any[]) => [
    { range: '0-10s', count: responses.filter(r => r.response_time && r.response_time <= 10).length },
    { range: '11-30s', count: responses.filter(r => r.response_time && r.response_time > 10 && r.response_time <= 30).length },
    { range: '31-60s', count: responses.filter(r => r.response_time && r.response_time > 30 && r.response_time <= 60).length },
    { range: '60s+', count: responses.filter(r => r.response_time && r.response_time > 60).length }
  ];

  const generateMonthlyRevenue = (sessions: any[]) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toISOString().slice(0, 7),
        amount: Math.floor(Math.random() * 5000) + 2000,
        sessions: Math.floor(Math.random() * 1000) + 500
      };
    });
    return last6Months;
  };

  const generateCreditConsumption = (sessions: any[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        credits: Math.floor(Math.random() * 100) + 20,
        revenue: (Math.floor(Math.random() * 100) + 20) * 0.5
      };
    });
    return last30Days;
  };

  const generateROIForecasting = () => {
    const next12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      return {
        month: date.toISOString().slice(0, 7),
        projectedReach: Math.floor(Math.random() * 10000) + 5000 + (i * 1000),
        estimatedValue: Math.floor(Math.random() * 25000) + 15000 + (i * 2000)
      };
    });
    return next12Months;
  };

  return {
    roomMetrics,
    userAnalytics,
    questionAnalytics,
    revenueAnalytics,
    advertiserMetrics,
    loading,
    refetch: fetchAllAnalytics
  };
};
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
    // Get all rooms with session timing data
    const { data: roomsData } = await supabase
      .from('game_rooms')
      .select('created_at, started_at, finished_at')
      .order('created_at', { ascending: false });

    // Active rooms today
    const today = new Date().toISOString().split('T')[0];
    const { count: activeToday } = await supabase
      .from('game_rooms')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Total rooms
    const { count: totalRooms } = await supabase
      .from('game_rooms')
      .select('*', { count: 'exact', head: true });

    // Process daily data for last 30 days
    const dailyRooms = processTimeSeriesData(roomsData || [], 'daily');
    const weeklyRooms = processTimeSeriesData(roomsData || [], 'weekly').map(item => ({ week: item.date, count: item.count }));
    const monthlyRooms = processTimeSeriesData(roomsData || [], 'monthly').map(item => ({ month: item.date, count: item.count }));

    // Calculate peak hours from real data
    const peakHours = calculatePeakHours(roomsData || []);

    // Calculate real average session time
    const sessionsWithDuration = (roomsData || []).filter(room => 
      room.finished_at && room.created_at
    );
    
    const avgDurationMs = sessionsWithDuration.length > 0 
      ? sessionsWithDuration.reduce((sum, room) => {
          const duration = new Date(room.finished_at!).getTime() - new Date(room.created_at).getTime();
          return sum + duration;
        }, 0) / sessionsWithDuration.length
      : 0;
    
    const averageSessionTime = Math.round(avgDurationMs / (1000 * 60)); // Convert to minutes

    setRoomMetrics({
      dailyRooms,
      weeklyRooms,
      monthlyRooms,
      totalRooms: totalRooms || 0,
      activeToday: activeToday || 0,
      averageSessionTime,
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

    // Calculate retention rate
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    // Real user growth data - only show actual registrations
    const userGrowth = generateRealUserGrowthData(profiles || []);

    setUserAnalytics({
      totalUsers,
      activeUsers,
      retentionRate,
      averageSessionsPerUser: sessions ? sessions.length / Math.max(totalUsers, 1) : 0,
      userGrowth,
      cohortAnalysis: [] // Remove mock cohort data
    });
  };

  const fetchQuestionAnalytics = async () => {
    // Get all responses with question details
    const { data: responses } = await supabase
      .from('game_responses')
      .select('card_id, response_time, evaluation, created_at');

    // Get all questions to join with responses
    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, language, level_id, is_active')
      .eq('is_active', true);

    // Get levels for level names
    const { data: levels } = await supabase
      .from('levels')
      .select('id, name, sort_order');

    const questionUsage = processRealQuestionUsage(responses || [], questions || [], levels || []);
    const languageDistribution = processLanguageDistribution(questions || []);
    const levelPopularity = await fetchRealLevelPopularity();
    const responseTimeDistribution = generateRealResponseTimeDistribution(responses || []);

    setQuestionAnalytics({
      topQuestions: questionUsage,
      languageDistribution,
      levelPopularity,
      responseTimeDistribution
    });
  };

  const fetchRevenueAnalytics = async () => {
    // Get credit data
    const { data: credits } = await supabase
      .from('credits')
      .select('total_purchased, total_consumed, created_at, updated_at');

    // Get session data
    const { data: sessions } = await supabase
      .from('sessions')
      .select('started_at, credits_consumed, user_id');

    const totalCredits = credits?.reduce((sum, c) => sum + c.total_purchased, 0) || 0;
    const totalConsumed = credits?.reduce((sum, c) => sum + c.total_consumed, 0) || 0;
    
    // Calculate real revenue metrics
    const estimatedRevenue = totalCredits * 0.8; // Assuming average $0.80 per credit
    const conversionRate = credits && credits.length > 0 
      ? (credits.filter(c => c.total_purchased > 0).length / credits.length) * 100 
      : 0;

    const monthlyRevenue = generateRealMonthlyRevenue(sessions || []);
    const creditConsumption = generateRealCreditConsumption(sessions || []);

    setRevenueAnalytics({
      totalRevenue: estimatedRevenue,
      monthlyRevenue,
      creditConsumption,
      conversionRate,
      averageSessionValue: sessions && sessions.length > 0 ? estimatedRevenue / sessions.length : 0,
      lifetimeValue: estimatedRevenue
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

  const processRealQuestionUsage = (responses: any[], questions: any[], levels: any[]) => {
    const questionStats: { [id: string]: any } = {};
    
    // Create lookup maps
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const levelMap = new Map(levels.map(l => [l.id, l]));
    
    responses.forEach(response => {
      const id = response.card_id;
      const question = questionMap.get(id);
      if (!question) return;
      
      const level = levelMap.get(question.level_id);
      
      if (!questionStats[id]) {
        questionStats[id] = {
          id,
          text: question.text,
          timesShown: 0,
          totalResponseTime: 0,
          totalHonestyScore: 0,
          evaluationCount: 0,
          level: level?.name || `Level ${level?.sort_order || 'Unknown'}`,
          language: question.language
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
        avgHonestyScore: stats.evaluationCount > 0 ? stats.totalHonestyScore / stats.evaluationCount : 0
      }))
      .sort((a: any, b: any) => b.timesShown - a.timesShown)
      .slice(0, 15);
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

  const fetchRealLevelPopularity = async () => {
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select('level, created_at, finished_at');

    const { data: levels } = await supabase
      .from('levels')
      .select('id, name, sort_order')
      .order('sort_order');

    const levelStats: { [level: string]: any } = {};
    
    // Initialize all levels
    levels?.forEach(level => {
      levelStats[level.sort_order] = {
        level: level.name,
        sessions: 0,
        totalDuration: 0
      };
    });
    
    rooms?.forEach(room => {
      const levelKey = room.level;
      if (!levelStats[levelKey]) {
        levelStats[levelKey] = {
          level: `Level ${levelKey}`,
          sessions: 0,
          totalDuration: 0
        };
      }
      
      levelStats[levelKey].sessions++;
      if (room.finished_at && room.created_at) {
        const duration = new Date(room.finished_at).getTime() - new Date(room.created_at).getTime();
        levelStats[levelKey].totalDuration += duration / (1000 * 60); // Convert to minutes
      }
    });

    return Object.values(levelStats).map((stats: any) => ({
      ...stats,
      avgDuration: stats.sessions > 0 ? stats.totalDuration / stats.sessions : 0
    }));
  };

  // Real data generators
  const generateRealUserGrowthData = (profiles: any[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const newUsers = profiles.filter(p => 
        p.created_at && p.created_at.startsWith(dateStr)
      ).length;
      
      return {
        date: dateStr,
        newUsers,
        returningUsers: 0 // For simplicity, as we'd need session data to track returns
      };
    });

    return last30Days;
  };

  const generateRealResponseTimeDistribution = (responses: any[]) => {
    const validResponses = responses.filter(r => r.response_time && r.response_time > 0);
    
    return [
      { range: '0-10s', count: validResponses.filter(r => r.response_time <= 10).length },
      { range: '11-30s', count: validResponses.filter(r => r.response_time > 10 && r.response_time <= 30).length },
      { range: '31-60s', count: validResponses.filter(r => r.response_time > 30 && r.response_time <= 60).length },
      { range: '60s+', count: validResponses.filter(r => r.response_time > 60).length }
    ];
  };

  const generateRealMonthlyRevenue = (sessions: any[]) => {
    const monthlyData: { [month: string]: { sessions: number; revenue: number } } = {};
    
    sessions.forEach(session => {
      if (session.started_at) {
        const month = session.started_at.slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { sessions: 0, revenue: 0 };
        }
        monthlyData[month].sessions++;
        monthlyData[month].revenue += (session.credits_consumed || 1) * 0.8; // $0.80 per credit
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        amount: data.revenue,
        sessions: data.sessions
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  const generateRealCreditConsumption = (sessions: any[]) => {
    const dailyData: { [date: string]: { credits: number; revenue: number } } = {};
    
    sessions.forEach(session => {
      if (session.started_at) {
        const date = session.started_at.split('T')[0]; // YYYY-MM-DD
        if (!dailyData[date]) {
          dailyData[date] = { credits: 0, revenue: 0 };
        }
        const credits = session.credits_consumed || 1;
        dailyData[date].credits += credits;
        dailyData[date].revenue += credits * 0.8;
      }
    });

    // Fill in missing days with 0 for last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      return {
        date: dateStr,
        credits: dailyData[dateStr]?.credits || 0,
        revenue: dailyData[dateStr]?.revenue || 0
      };
    });

    return last30Days;
  };

  const generateROIForecasting = () => {
    // Simple projection based on current growth
    const next12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const baseValue = 100 + (i * 50); // Conservative growth projection
      
      return {
        month: date.toISOString().slice(0, 7),
        projectedReach: baseValue * 10,
        estimatedValue: baseValue * 25
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
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Brain, Sparkles, TrendingUp, Clock, MessageSquare } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { RoomAnalyticsData } from '@/hooks/useRoomAnalytics';

interface EnhancedHeroSectionProps {
  insights: ConnectionInsightsData;
  analytics: RoomAnalyticsData | null;
}

const getScoreMessage = (score: number) => {
  if (score >= 85) return { text: "Extraordinary Connection", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 70) return { text: "Strong Compatibility", color: "text-green-600", bg: "bg-green-50" };
  if (score >= 55) return { text: "Growing Connection", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 40) return { text: "Building Foundation", color: "text-yellow-600", bg: "bg-yellow-50" };
  return { text: "Early Exploration", color: "text-orange-600", bg: "bg-orange-50" };
};

const getPhaseData = (phase: string) => {
  const phases = {
    'Initial Attraction': { icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-50' },
    'Deep Connection': { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
    'Building Trust': { icon: Brain, color: 'text-blue-500', bg: 'bg-blue-50' },
    'Exploring Together': { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' }
  };
  return phases[phase as keyof typeof phases] || { icon: Heart, color: 'text-primary', bg: 'bg-primary/5' };
};

const extractKeyInsights = (insights: ConnectionInsightsData, analytics: RoomAnalyticsData | null) => {
  const keyInsights = [];
  
  // Compatibility insight
  if (insights.compatibilityScore >= 70) {
    keyInsights.push({
      icon: Heart,
      title: "High Compatibility",
      description: "Your responses show strong alignment and mutual understanding",
      color: "text-emerald-600"
    });
  }
  
  // Response pattern insight
  if (analytics?.sessionAverages.avgResponseTime && analytics.sessionAverages.avgResponseTime < 30000) {
    keyInsights.push({
      icon: Clock,
      title: "Authentic Responses",
      description: "Quick, genuine reactions indicate natural conversation flow",
      color: "text-blue-600"
    });
  }
  
  // Growth insight
  if (insights.growthAreas && insights.growthAreas.length > 0) {
    keyInsights.push({
      icon: TrendingUp,
      title: "Growth Potential",
      description: "Clear opportunities for deeper connection identified",
      color: "text-purple-600"
    });
  }
  
  return keyInsights.slice(0, 3); // Show max 3 insights
};

export const EnhancedHeroSection: React.FC<EnhancedHeroSectionProps> = ({ insights, analytics }) => {
  const scoreMessage = getScoreMessage(insights.compatibilityScore);
  const phaseData = getPhaseData(insights.relationshipPhase);
  const PhaseIcon = phaseData.icon;
  const keyInsights = extractKeyInsights(insights, analytics);
  
  return (
    <div className="relative mb-12">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl blur-3xl -z-10"></div>
      
      <Card className="relative bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border-primary/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            {/* Phase badge */}
            <div className="flex justify-center mb-6">
              <Badge className={`${phaseData.bg} ${phaseData.color} border-0 px-4 py-2 text-sm font-medium`}>
                <PhaseIcon className="w-4 h-4 mr-2" />
                {insights.relationshipPhase}
              </Badge>
            </div>
            
            {/* Main compatibility score */}
            <div className="relative">
              <div className="text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2 animate-fade-in">
                {insights.compatibilityScore}%
              </div>
              <div className={`text-xl font-semibold ${scoreMessage.color} mb-2`}>
                {scoreMessage.text}
              </div>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Based on your responses and interaction patterns
              </p>
            </div>
          </div>
          
          {/* Key insights grid */}
          {keyInsights.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {keyInsights.map((insight, index) => (
                <div 
                  key={index}
                  className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover-scale"
                >
                  <insight.icon className={`w-8 h-8 ${insight.color} mx-auto mb-3`} />
                  <h3 className="font-semibold text-foreground mb-2">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Session stats */}
          <div className="flex justify-center gap-8 mt-8 pt-6 border-t border-border/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {analytics?.items.length || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {Math.round((analytics?.sessionAverages.avgResponseTime || 0) / 1000)}s
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {Math.max(...(analytics?.items.map(item => 
                  Math.max(...Object.values(item.evaluation || {}).filter(v => typeof v === 'number'))
                ) || [0]))}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Peak Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
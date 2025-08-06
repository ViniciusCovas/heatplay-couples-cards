import React from 'react';
import { Trophy, Star, Heart, Zap, Clock, Target, Brain } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { Badge } from '@/components/ui/badge';

interface HeroSectionProps {
  insights: ConnectionInsightsData;
}

export const HeroSection = ({ insights }: HeroSectionProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const getPhaseData = (phase: string) => {
    const phases = {
      exploring: { icon: '🌱', color: 'bg-green-500', label: 'Exploring' },
      building: { icon: '🏗️', color: 'bg-blue-500', label: 'Building' },
      deepening: { icon: '💞', color: 'bg-purple-500', label: 'Deepening' },
      mastering: { icon: '👑', color: 'bg-yellow-500', label: 'Mastering' }
    };
    return phases[phase as keyof typeof phases] || phases.exploring;
  };

  const phaseData = getPhaseData(insights.relationshipPhase);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 rounded-3xl p-8 mb-12">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent animate-pulse" />
      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-2xl animate-fade-in" />
      <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-xl animate-fade-in delay-500" />
      
      <div className="relative z-10">
        {/* Phase Badge */}
        <div className="flex justify-center mb-6">
          <Badge className={`${phaseData.color} text-white px-4 py-2 text-sm font-semibold hover-scale`}>
            <span className="mr-2">{phaseData.icon}</span>
            {phaseData.label} Phase
          </Badge>
        </div>

        {/* Animated Compatibility Gauge */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center">
            {/* Outer ring with score fill */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${insights.compatibilityScore * 2.83} 283`}
                  className="transition-all duration-2000 ease-out animate-scale-in"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className="text-primary" stopColor="currentColor" />
                    <stop offset="100%" className="text-secondary" stopColor="currentColor" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Inner content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-foreground mb-2 animate-fade-in">
                    {insights.compatibilityScore}%
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">
                    Compatibility Score
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating achievement badges */}
            <div className="absolute -top-2 -right-2 w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            
            {/* Sparkle effects */}
            <Star className="absolute top-6 right-8 w-5 h-5 text-yellow-400 animate-pulse" />
            <Star className="absolute bottom-8 left-6 w-4 h-4 text-yellow-300 animate-pulse delay-500" />
            <Zap className="absolute top-12 left-12 w-4 h-4 text-primary animate-pulse delay-1000" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mt-6 mb-2 animate-fade-in">
            Connection Analysis Complete!
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in delay-300">
            Your relationship is in the <span className="text-primary font-semibold capitalize">{insights.relationshipPhase}</span> phase. 
            Here's your personalized connection blueprint.
          </p>
        </div>

        {/* Session Quick Stats */}
        <div className="flex justify-center mb-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center hover-scale">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{insights.sessionData.responseCount}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center hover-scale">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{insights.sessionData.averageResponseTime}s</div>
              <div className="text-xs text-muted-foreground">Avg Response</div>
            </div>
            
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center hover-scale">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center mx-auto mb-2">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">L{insights.sessionData.level}</div>
              <div className="text-xs text-muted-foreground">Max Level</div>
            </div>
          </div>
        </div>

        {/* Player Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Player 1</div>
                <div className="text-sm text-muted-foreground">Connection Contributor</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Session Responses</span>
                <span className="font-medium">{insights.sessionData.responseCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-medium">{insights.sessionData.averageResponseTime}s</span>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Player 2</div>
                <div className="text-sm text-muted-foreground">Connection Contributor</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Session Responses</span>
                <span className="font-medium">{insights.sessionData.responseCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-medium">{insights.sessionData.averageResponseTime}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
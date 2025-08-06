import React from 'react';
import { Trophy, Star, Heart, Zap } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface HeroSectionProps {
  insights: ConnectionInsightsData;
}

export const HeroSection = ({ insights }: HeroSectionProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 rounded-3xl p-8 mb-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-xl" />
      
      <div className="relative z-10">
        {/* Main Score Circle */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary animate-heartbeat opacity-20" />
              
              {/* Score display */}
              <div className="relative z-10 text-center">
                <div className="text-4xl font-bold text-white mb-1">
                  {insights.compatibilityScore}%
                </div>
                <div className="text-white/80 text-sm font-medium">
                  Compatibility
                </div>
              </div>
              
              {/* Sparkle effects */}
              <Star className="absolute top-4 right-6 w-4 h-4 text-white/60 animate-pulse" />
              <Star className="absolute bottom-6 left-4 w-3 h-3 text-white/40 animate-pulse delay-500" />
              <Zap className="absolute top-8 left-8 w-3 h-3 text-white/50 animate-pulse delay-1000" />
            </div>
            
            {/* Trophy badge */}
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mt-6 mb-2">
            Relationship Achievement Unlocked!
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            You've reached the <span className="text-primary font-semibold capitalize">{insights.relationshipPhase}</span> phase. 
            Your connection journey is creating beautiful moments together.
          </p>
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
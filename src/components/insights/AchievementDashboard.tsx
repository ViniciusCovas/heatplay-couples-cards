import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Award, Lock, Star, Heart, Zap, Eye, Target } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface AchievementDashboardProps {
  insights: ConnectionInsightsData;
}

export const AchievementDashboard = ({ insights }: AchievementDashboardProps) => {
  const achievementIcons = {
    communication: Heart,
    intimacy: Star,
    trust: Eye,
    compatibility: Zap,
    growth: Target,
  };

  const getAchievementColor = (score: number) => {
    if (score >= 4) return 'from-yellow-400 to-yellow-600'; // Gold
    if (score >= 3) return 'from-blue-400 to-blue-600'; // Silver
    return 'from-gray-400 to-gray-600'; // Bronze
  };

  const getAchievementRank = (score: number) => {
    if (score >= 4.5) return 'Master';
    if (score >= 4) return 'Expert';
    if (score >= 3.5) return 'Advanced';
    if (score >= 3) return 'Intermediate';
    return 'Beginner';
  };

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Relationship Achievements Unlocked
        </h2>
        <p className="text-muted-foreground">
          Your connection strengths transformed into gaming achievements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.strengthAreas?.map((strength, index) => {
          const IconComponent = achievementIcons[strength.area as keyof typeof achievementIcons] || Star;
          const isUnlocked = strength.score >= 3;
          
          return (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 hover:scale-105 ${
                isUnlocked 
                  ? 'border-primary/30 bg-gradient-to-br from-white to-primary/5 shadow-lg hover:shadow-primary/20' 
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              {/* Achievement unlock animation overlay */}
              {isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 animate-fade-in" />
              )}
              
              <div className="relative p-6 text-center">
                {/* Achievement badge */}
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center relative ${
                  isUnlocked 
                    ? `bg-gradient-to-br ${getAchievementColor(strength.score)} shadow-lg` 
                    : 'bg-gray-300'
                }`}>
                  {isUnlocked ? (
                    <IconComponent className="w-10 h-10 text-white" />
                  ) : (
                    <Lock className="w-10 h-10 text-gray-500" />
                  )}
                  
                  {/* Sparkle effect for high scores */}
                  {strength.score >= 4 && (
                    <>
                      <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
                      <Star className="absolute -bottom-1 -left-1 w-3 h-3 text-yellow-400 animate-pulse delay-500" />
                    </>
                  )}
                </div>

                {/* Achievement details */}
                <h3 className="font-bold text-lg text-foreground mb-2 capitalize">
                  {strength.area} {isUnlocked ? 'Master' : 'Locked'}
                </h3>
                
                {isUnlocked ? (
                  <>
                    <Badge 
                      variant="secondary" 
                      className="mb-3 bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30"
                    >
                      {getAchievementRank(strength.score)} - {strength.score}/5
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {strength.insight}
                    </p>
                    
                    {/* XP Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{Math.round(strength.score * 20)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${strength.score * 20}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Complete more sessions to unlock this achievement
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Future achievements preview */}
        {insights.growthAreas?.slice(0, 2).map((growth, index) => (
          <div
            key={`growth-${index}`}
            className="relative overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 opacity-60"
          >
            <div className="relative p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-300 flex items-center justify-center">
                <Lock className="w-10 h-10 text-gray-500" />
              </div>
              
              <h3 className="font-bold text-lg text-gray-600 mb-2 capitalize">
                {growth.area} Expert
              </h3>
              
              <Badge variant="outline" className="mb-3 border-gray-400 text-gray-600">
                Coming Soon
              </Badge>
              
              <p className="text-sm text-gray-500">
                {growth.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
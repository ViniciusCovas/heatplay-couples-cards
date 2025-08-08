import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy,
  Medal,
  Star,
  Crown,
  Zap,
  Shield,
  Heart,
  Award,
  Target,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAdvancedInsights } from '@/hooks/useAdvancedInsights';

interface AdvancedAchievementsProps {
  roomCode: string;
}

export const AdvancedAchievements: React.FC<AdvancedAchievementsProps> = ({ roomCode }) => {
  const { data: advancedInsights } = useAdvancedInsights(roomCode);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!advancedInsights) return null;

  const { achievements, relationshipXP, currentLevel } = advancedInsights;

  const iconMap = {
    Zap,
    Shield,
    Award,
    Heart,
    Target,
    Clock,
    Users,
    TrendingUp,
    Trophy,
    Medal,
    Star,
    Crown,
    Sparkles
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 'bronze': return 'bg-gradient-to-r from-orange-700 to-yellow-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return Crown;
      case 'gold': return Trophy;
      case 'silver': return Medal;
      case 'bronze': return Star;
      default: return Award;
    }
  };

  const getXPToNextLevel = (currentXP: number, level: number) => {
    const nextLevelXP = level * 100; // 100 XP per level
    return Math.max(0, nextLevelXP - currentXP);
  };

  const getCurrentLevelProgress = (currentXP: number, level: number) => {
    const currentLevelXP = (level - 1) * 100;
    const nextLevelXP = level * 100;
    const progressInLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    return Math.max(0, Math.min(100, (progressInLevel / xpNeededForLevel) * 100));
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All', icon: Award },
    { id: 'performance', label: 'Performance', icon: Target },
    { id: 'consistency', label: 'Consistency', icon: Clock },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'special', label: 'Special', icon: Sparkles },
  ];

  return (
    <div className="space-y-8">
      {/* Header with XP and Level */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Relationship Milestones</h2>
        </div>
        
        {/* Level and XP Display */}
        <Card className="max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                <span className="text-2xl font-bold text-primary">Level {currentLevel}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Relationship XP</span>
                  <span className="font-medium">{relationshipXP} XP</span>
                </div>
                <Progress 
                  value={getCurrentLevelProgress(relationshipXP, currentLevel)} 
                  className="h-3"
                />
                <div className="text-xs text-muted-foreground">
                  {getXPToNextLevel(relationshipXP, currentLevel)} XP to next level
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-5 w-full max-w-md mx-auto">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-8">
          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((achievement) => {
              const IconComponent = iconMap[achievement.icon as keyof typeof iconMap] || Award;
              const TierIcon = getTierIcon(achievement.tier);
              
              return (
                <Card 
                  key={achievement.id} 
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    achievement.unlocked ? 'hover:scale-105' : 'opacity-60'
                  }`}
                >
                  {achievement.unlocked && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${getTierColor(achievement.tier)}`} />
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          achievement.unlocked ? getTierColor(achievement.tier) : 'bg-muted'
                        }`}>
                          {achievement.unlocked ? (
                            <IconComponent className="w-6 h-6" />
                          ) : (
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{achievement.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <TierIcon className="w-4 h-4" />
                            <Badge variant="outline" className="text-xs">
                              {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    
                    {achievement.unlocked ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-2" />
                        {achievement.progress === achievement.maxProgress && (
                          <Badge className={getTierColor(achievement.tier)}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            Completed!
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Keep playing to unlock this achievement
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredAchievements.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No achievements in this category yet</h3>
                <p className="text-muted-foreground">
                  Complete more sessions to unlock achievements in this category
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Achievement Statistics */}
      <Card className="bg-gradient-to-br from-accent/5 to-muted/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-accent" />
            Achievement Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {achievements.filter(a => a.unlocked).length}
              </div>
              <div className="text-sm text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-secondary">
                {achievements.filter(a => a.tier === 'platinum' && a.unlocked).length}
              </div>
              <div className="text-sm text-muted-foreground">Platinum</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-accent">
                {Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Completion</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {relationshipXP}
              </div>
              <div className="text-sm text-muted-foreground">Total XP</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
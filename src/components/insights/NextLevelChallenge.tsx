import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Zap, Trophy, Star, Heart } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';
import { useNavigate } from 'react-router-dom';

interface NextLevelChallengeProps {
  insights: ConnectionInsightsData;
}

export const NextLevelChallenge = ({ insights }: NextLevelChallengeProps) => {
  const navigate = useNavigate();

  // Calculate completion percentage based on current phase
  const phaseCompletion = {
    exploring: 25,
    building: 50,
    deepening: 75,
    mastering: 100,
  };

  const currentCompletion = phaseCompletion[insights.relationshipPhase.toLowerCase() as keyof typeof phaseCompletion] || 25;
  const nextPhaseReward = currentCompletion < 100 ? 'Next Phase Unlock' : 'Mastery Badge';

  return (
    <div className="mb-12">
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/30 shadow-xl">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-xl" />
        
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Recommended Next Steps</CardTitle>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Evidence-informed suggestions to keep meaningful conversations going. Continue at your own pace.
          </p>
        </CardHeader>

          <CardContent className="space-y-8">
            {/* Progress Section */}
            <div className="text-center">
              <div className="mb-4">
                <div className="text-3xl font-bold text-foreground mb-2">
                  {currentCompletion}%
                </div>
                <p className="text-muted-foreground">Journey Completion</p>
              </div>
              
              <div className="max-w-md mx-auto mb-6">
                <Progress 
                  value={currentCompletion} 
                  className="h-4 bg-gray-200"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>Started</span>
                  <span>Mastery</span>
                </div>
              </div>

            </div>


            {/* Next Session Recommendation */}
            {insights.nextSessionRecommendation && (
              <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2">Recommended Next Session:</h4>
                <p className="text-muted-foreground mb-4">{insights.nextSessionRecommendation}</p>
                
                <Button 
                  onClick={() => navigate('/create-room')}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <span>Start New Session</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* Session Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-primary/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {insights.sessionData.responseCount}
                </div>
                <div className="text-sm text-muted-foreground">Total Responses</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {insights.sessionData.averageResponseTime}s
                </div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {insights.strengthAreas?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Strengths</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground capitalize">
                  {insights.relationshipPhase}
                </div>
                <div className="text-sm text-muted-foreground">Current Phase</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, ArrowRight, Star, Heart, Zap, Eye } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface GrowthJourneyProps {
  insights: ConnectionInsightsData;
}

export const GrowthJourney = ({ insights }: GrowthJourneyProps) => {
  const relationshipPhases = [
    {
      name: 'exploring',
      title: 'Exploring',
      description: 'Getting to know each other',
      icon: Eye,
      color: 'from-blue-400 to-blue-600',
    },
    {
      name: 'building',
      title: 'Building',
      description: 'Developing trust and connection',
      icon: Heart,
      color: 'from-green-400 to-green-600',
    },
    {
      name: 'deepening',
      title: 'Deepening',
      description: 'Strengthening emotional bonds',
      icon: Zap,
      color: 'from-purple-400 to-purple-600',
    },
    {
      name: 'mastering',
      title: 'Mastering',
      description: 'Achieving deep intimacy',
      icon: Star,
      color: 'from-yellow-400 to-yellow-600',
    },
  ];

  const currentPhaseIndex = relationshipPhases.findIndex(
    phase => phase.name === insights.relationshipPhase.toLowerCase()
  );

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <ArrowRight className="w-6 h-6 text-primary" />
          Your Connection Journey
        </h2>
        <p className="text-muted-foreground">
          A clear view of where you are and what comes next
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white to-secondary/5 border-secondary/20 shadow-lg">
        <CardContent className="p-8">
          {/* Timeline */}
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full transform -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-full transform -translate-y-1/2 z-10 transition-all duration-1000 ease-out"
              style={{ width: `${((currentPhaseIndex + 1) / relationshipPhases.length) * 100}%` }}
            />

            {/* Phase nodes */}
            <div className="relative z-20 flex justify-between items-center">
              {relationshipPhases.map((phase, index) => {
                const isCompleted = index < currentPhaseIndex;
                const isCurrent = index === currentPhaseIndex;
                const isUpcoming = index > currentPhaseIndex;
                const IconComponent = phase.icon;

                return (
                  <div key={phase.name} className="flex flex-col items-center">
                    {/* Phase circle */}
                    <div 
                      className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${
                        isCompleted 
                          ? `bg-gradient-to-br ${phase.color} shadow-lg scale-110` 
                          : isCurrent 
                          ? `bg-gradient-to-br ${phase.color} shadow-lg scale-125 animate-heartbeat` 
                          : 'bg-gray-200'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-8 h-8 text-white" />
                      ) : isCurrent ? (
                        <IconComponent className="w-8 h-8 text-white" />
                      ) : (
                        <Circle className="w-8 h-8 text-gray-400" />
                      )}
                      
                      {/* Sparkle effect for current phase */}
                      {isCurrent && (
                        <>
                          <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
                          <Star className="absolute -bottom-1 -left-1 w-3 h-3 text-yellow-400 animate-pulse delay-500" />
                        </>
                      )}
                    </div>

                    {/* Phase info */}
                    <div className="text-center max-w-24">
                      <h4 className={`font-bold text-sm mb-1 ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {phase.title}
                      </h4>
                      
                      {isCurrent && (
                        <Badge 
                          variant="secondary" 
                          className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 text-xs"
                        >
                          Current
                        </Badge>
                      )}
                      
                      {isUpcoming && (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                          Coming
                        </Badge>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1 hidden md:block">
                        {phase.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current phase details */}
          <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20">
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Current Phase: {relationshipPhases[currentPhaseIndex]?.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {relationshipPhases[currentPhaseIndex]?.description}
              </p>
              <div className="text-sm text-muted-foreground">
                Progress through phases is not linear—focus on understanding and growth over time.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
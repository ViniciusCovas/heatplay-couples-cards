import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Shield, Heart } from 'lucide-react';

interface PsychologicalProfileProps {
  insights: any;
  analytics?: any;
}

export const PsychologicalProfile: React.FC<PsychologicalProfileProps> = ({ insights, analytics }) => {
  const pillars = insights.pillars || {};
  
  const getCommunicationStyle = () => {
    const honesty = pillars.honesty || 0;
    const intimacy = pillars.intimacy || 0;
    const attraction = pillars.attraction || 0;
    
    if (honesty > 4 && intimacy > 4) return { style: 'Deep Connectors', color: 'text-blue-500' };
    if (attraction > 4 && honesty > 3.5) return { style: 'Passionate Truthseekers', color: 'text-red-500' };
    if (intimacy > 3.5 && attraction > 3.5) return { style: 'Balanced Builders', color: 'text-green-500' };
    return { style: 'Explorers', color: 'text-purple-500' };
  };

  const getRelationshipVelocity = () => {
    const avgScore = (pillars.honesty + pillars.intimacy + pillars.attraction + pillars.surprise) / 4;
    if (avgScore > 4) return { speed: 'Accelerating', direction: 'Deepening', momentum: 'High' };
    if (avgScore > 3) return { speed: 'Steady', direction: 'Building', momentum: 'Moderate' };
    return { speed: 'Exploratory', direction: 'Testing', momentum: 'Gentle' };
  };

  const getAttachmentPattern = () => {
    const honesty = pillars.honesty || 0;
    const intimacy = pillars.intimacy || 0;
    
    if (honesty > 4 && intimacy > 4) return 'Secure';
    if (intimacy > honesty) return 'Anxious-Secure';
    if (honesty > intimacy) return 'Avoidant-Secure';
    return 'Developing';
  };

  const communication = getCommunicationStyle();
  const velocity = getRelationshipVelocity();
  const attachment = getAttachmentPattern();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Communication DNA Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Communication Style</div>
                <div className={`text-lg font-semibold ${communication.color}`}>
                  {communication.style}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Attachment Pattern</div>
                <Badge variant="outline" className="text-sm">
                  {attachment}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Relationship Velocity</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{velocity.speed}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm">{velocity.direction}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Momentum</div>
                <Badge variant={velocity.momentum === 'High' ? 'default' : 'secondary'}>
                  {velocity.momentum}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Trust Architecture (Gottman Framework)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Emotional Safety</span>
                  <span>{((pillars.honesty || 0) * 20).toFixed(0)}%</span>
                </div>
                <Progress value={(pillars.honesty || 0) * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Vulnerability Comfort</span>
                  <span>{((pillars.intimacy || 0) * 20).toFixed(0)}%</span>
                </div>
                <Progress value={(pillars.intimacy || 0) * 20} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Attraction Stability</span>
                  <span>{((pillars.attraction || 0) * 20).toFixed(0)}%</span>
                </div>
                <Progress value={(pillars.attraction || 0) * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Novelty Integration</span>
                  <span>{((pillars.surprise || 0) * 20).toFixed(0)}%</span>
                </div>
                <Progress value={(pillars.surprise || 0) * 20} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Self-Expansion Theory Markers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-background border border-border rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">GROWTH POTENTIAL</div>
              <div className="text-lg font-bold text-green-500">
                {((pillars.surprise || 0) * 20).toFixed(0)}%
              </div>
            </div>
            <div className="p-3 bg-background border border-border rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">COMFORT ZONE</div>
              <div className="text-lg font-bold text-blue-500">
                {((pillars.intimacy || 0) * 20).toFixed(0)}%
              </div>
            </div>
            <div className="p-3 bg-background border border-border rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">EXPANSION RATE</div>
              <div className="text-lg font-bold text-purple-500">
                {(((pillars.surprise || 0) + (pillars.attraction || 0)) * 10).toFixed(0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
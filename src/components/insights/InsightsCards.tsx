import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Eye, Star, ArrowRight, RefreshCw } from 'lucide-react';
import { ConnectionInsightsData } from '@/hooks/useConnectionInsights';

interface InsightsCardsProps {
  insights: ConnectionInsightsData;
}

export const InsightsCards = ({ insights }: InsightsCardsProps) => {
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          AI-Powered Relationship Insights
        </h2>
        <p className="text-muted-foreground">
          Discover hidden patterns and get personalized tips for your relationship
        </p>
      </div>

      {/* Key Insights */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Key Discoveries
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.keyInsights?.map((insight, index) => (
            <div
              key={index}
              className={`relative h-32 cursor-pointer group perspective-1000 ${
                flippedCards.includes(index) ? 'flipped' : ''
              }`}
              onClick={() => toggleFlip(index)}
            >
              {/* Card Container */}
              <div className="relative w-full h-full transition-transform duration-600 transform-style-preserve-3d">
                {/* Front */}
                <Card className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 backface-hidden ${
                  flippedCards.includes(index) ? 'rotate-y-180' : ''
                }`}>
                  <CardContent className="p-4 h-full flex items-center justify-center">
                    <div className="text-center">
                      <Lightbulb className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Insight #{index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to reveal
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Back */}
                <Card className={`absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/10 border-secondary/30 backface-hidden rotate-y-180 ${
                  flippedCards.includes(index) ? 'rotate-y-0' : ''
                }`}>
                  <CardContent className="p-4 h-full flex items-center">
                    <div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {insight}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary" className="text-xs">
                          AI Generated
                        </Badge>
                        <RefreshCw className="w-4 h-4 text-muted-foreground opacity-50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personalized Tips */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-secondary" />
          Personalized Growth Tips
        </h3>
        <div className="space-y-4">
          {insights.personalizedTips?.map((tip, index) => (
            <Card 
              key={index} 
              className="bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground leading-relaxed">{tip}</p>
                    <Badge variant="outline" className="mt-2 text-xs border-secondary/30 text-secondary">
                      Actionable Tip
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cultural Context */}
      {insights.culturalNotes && (
        <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-accent" />
              Cultural Context & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{insights.culturalNotes}</p>
            <Badge variant="secondary" className="mt-3 bg-accent/20 text-accent border-accent/30">
              Culturally Aware Analysis
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
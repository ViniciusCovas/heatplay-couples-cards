import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Eye, 
  Star, 
  ArrowRight, 
  RefreshCw, 
  Brain,
  Heart,
  Zap,
  Target,
  Sparkles,
  TrendingUp
} from 'lucide-react';
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

  const getCardColor = (index: number) => {
    const colors = [
      'from-blue-500/10 to-blue-600/5 border-blue-200',
      'from-pink-500/10 to-pink-600/5 border-pink-200', 
      'from-purple-500/10 to-purple-600/5 border-purple-200',
      'from-orange-500/10 to-orange-600/5 border-orange-200'
    ];
    return colors[index % colors.length];
  };

  const getCardIcon = (index: number) => {
    const icons = [Brain, Heart, Star, Zap];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI-Powered Key Discoveries
        </h2>
        <p className="text-muted-foreground">
          Flip each card to reveal personalized insights about your connection
        </p>
      </div>

      {/* Enhanced Color-Coded Flip Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.keyInsights?.slice(0, 4).map((insight, index) => (
            <Card 
              key={index}
              className={`relative h-52 cursor-pointer transition-all duration-700 hover:shadow-xl hover-scale group perspective-1000 ${
                flippedCards.includes(index) ? '[transform-style:preserve-3d] [transform:rotateY(180deg)]' : ''
              }`}
              onClick={() => toggleFlip(index)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getCardColor(index)} rounded-lg backface-hidden border-2 shadow-lg`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md`}>
                      {getCardIcon(index)}
                    </div>
                    <div>
                      <div className="text-foreground">Key Discovery</div>
                      <div className="text-sm text-muted-foreground font-normal">#{index + 1}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Tap to reveal your insight
                    </p>
                  </div>
                </CardContent>
              </div>

              {/* Back of card */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getCardColor(index)} rounded-lg [transform:rotateY(180deg)] backface-hidden border-2 shadow-lg`}>
                <CardContent className="p-6 h-full flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      {getCardIcon(index)}
                    </div>
                  </div>
                  <p className="text-foreground text-center leading-relaxed text-sm font-medium bg-white/20 backdrop-blur-sm p-4 rounded-lg">
                    {insight}
                  </p>
                  <div className="text-center mt-4">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      🧠 AI Discovery
                    </Badge>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced Growth Tips with Icons */}
      <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20 shadow-lg mb-8 hover-scale">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-foreground">Personalized Growth Tips</div>
              <div className="text-sm text-muted-foreground font-normal">Actionable insights for deeper connection</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.personalizedTips?.map((tip, index) => {
              const tipIcons = [Target, Heart, Brain, Star, Zap];
              const TipIcon = tipIcons[index % tipIcons.length];
              return (
                <div key={index} className="flex items-start gap-4 p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover-scale group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <TipIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs bg-accent/10 border-accent/30">
                        Tip #{index + 1}
                      </Badge>
                    </div>
                    <p className="text-foreground leading-relaxed font-medium">{tip}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
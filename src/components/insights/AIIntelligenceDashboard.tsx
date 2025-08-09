import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Heart, 
  Zap, 
  Shield, 
  TrendingUp, 
  Eye, 
  Star,
  Target,
  Crown,
  Activity,
  ChevronRight,
  Sparkles,
  Triangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PsychologicalMetrics, IntelligenceInsights, BondMap } from '@/utils/psychologicalAnalysis';

interface AIIntelligenceDashboardProps {
  metrics: PsychologicalMetrics;
  insights: IntelligenceInsights;
  isVisible?: boolean;
}

export const AIIntelligenceDashboard: React.FC<AIIntelligenceDashboardProps> = ({
  metrics,
  insights,
  isVisible = true
}) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'brief' | 'deep' | 'actions'>('brief');

  if (!isVisible) return null;

  const getBondMapColor = (value: number) => {
    if (value >= 4.0) return 'text-emerald-500';
    if (value >= 3.0) return 'text-blue-500';
    if (value >= 2.0) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const BondMapVisualization = ({ bondMap }: { bondMap: BondMap }) => (
    <div className="relative w-48 h-48 mx-auto">
      {/* Triangle shape */}
      <svg width="192" height="192" viewBox="0 0 192 192" className="absolute inset-0">
        <defs>
          <linearGradient id="bondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* Triangle outline */}
        <path
          d="M 96 20 L 176 160 L 16 160 Z"
          fill="url(#bondGradient)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pulse"
        />
        
        {/* Bond Map points */}
        <circle cx="96" cy="40" r={4 + bondMap.closeness * 2} fill="hsl(var(--primary))" className="animate-pulse" />
        <circle cx="160" cy="140" r={4 + bondMap.spark * 2} fill="hsl(var(--secondary))" className="animate-pulse" />
        <circle cx="32" cy="140" r={4 + bondMap.anchor * 2} fill="hsl(var(--accent))" className="animate-pulse" />
      </svg>
      
      {/* Labels */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="text-center">
          <div className="text-xs font-medium">Closeness</div>
          <div className={`text-lg font-bold ${getBondMapColor(bondMap.closeness)}`}>
            {bondMap.closeness.toFixed(1)}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-4">
        <div className="text-center">
          <div className="text-xs font-medium">Spark</div>
          <div className={`text-lg font-bold ${getBondMapColor(bondMap.spark)}`}>
            {bondMap.spark.toFixed(1)}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-4">
        <div className="text-center">
          <div className="text-xs font-medium">Anchor</div>
          <div className={`text-lg font-bold ${getBondMapColor(bondMap.anchor)}`}>
            {bondMap.anchor.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );

  const CompatibilityIndicator = () => {
    const overallScore = ((metrics.bondMap.closeness + metrics.bondMap.spark + metrics.bondMap.anchor) / 3) * 20;
    
    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg width="128" height="128" className="transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="none"
            className="opacity-20"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallScore / 100)}`}
            className="transition-all duration-1000 ease-out"
            style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round(overallScore)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Compatibility
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl shadow-primary/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                GetClose AI Intelligence
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Relationship Intelligence Powered by Psychology
                <Badge variant="secondary" className="gap-1">
                  <Crown className="w-3 h-3" />
                  Premium Analysis
                </Badge>
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Activity className="w-3 h-3" />
              {insights.rarityMetrics.topPercentile}th Percentile
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brief" className="gap-2">
              <Eye className="w-4 h-4" />
              Brief
            </TabsTrigger>
            <TabsTrigger value="deep" className="gap-2">
              <Brain className="w-4 h-4" />
              Deep Dive
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Target className="w-4 h-4" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="space-y-6 mt-6">
            {/* Hero Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Bond Map Analysis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on Triangular Theory of Love
                  </p>
                </div>
                <BondMapVisualization bondMap={metrics.bondMap} />
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Overall Compatibility</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-calculated from all dimensions
                  </p>
                </div>
                <CompatibilityIndicator />
              </div>
            </div>

            <Separator />

            {/* Key Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Intelligence Highlights
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="font-medium">Primary Dynamic</span>
                    </div>
                    <p className="text-sm">{insights.primaryDynamic}</p>
                  </CardContent>
                </Card>
                
                <Card className="border border-secondary/20 bg-secondary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Communication DNA</span>
                    </div>
                    <p className="text-sm font-semibold">{insights.communicationDNA.style}</p>
                    <p className="text-xs text-muted-foreground">{insights.communicationDNA.description}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-accent/20 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Relationship Velocity</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{insights.relationshipVelocity.speed}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{insights.relationshipVelocity.direction}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                {insights.rarityMetrics.comparisonNote}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="deep" className="space-y-6 mt-6">
            {/* Psychological Progression Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Psychological Progression
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${
                      metrics.progression.trend === 'rising' ? 'text-green-500' :
                      metrics.progression.trend === 'declining' ? 'text-red-500' : 'text-blue-500'
                    }`} />
                    <div className="font-medium">Trend</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {metrics.progression.trend}
                    </div>
                    <div className="text-xs mt-1">
                      {Math.abs(metrics.progression.momentum * 100).toFixed(1)}% momentum
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="font-medium">Stability</div>
                    <div className="text-sm text-muted-foreground">
                      {(metrics.correlations.overallStability * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs mt-1">Emotional consistency</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <div className="font-medium">Breakthroughs</div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.highlights.breakthroughMoments.length}
                    </div>
                    <div className="text-xs mt-1">Significant moments</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Communication DNA Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Triangle className="w-5 h-5 text-primary" />
                Communication DNA Analysis
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Honesty-Intimacy Correlation</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={Math.abs(metrics.correlations.honestyIntimacy) * 100} 
                      className="w-20" 
                    />
                    <span className="text-sm font-mono">
                      {metrics.correlations.honestyIntimacy.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attraction-Surprise Sync</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={Math.abs(metrics.correlations.attractionSurprise) * 100} 
                      className="w-20" 
                    />
                    <span className="text-sm font-mono">
                      {metrics.correlations.attractionSurprise.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Unique Strengths */}
            {insights.uniqueStrengths.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Your Unique Strengths
                </h3>
                <div className="space-y-2">
                  {insights.uniqueStrengths.map((strength, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rarity Metrics */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Rarity Analysis
                  </Badge>
                </h4>
                <div className="space-y-2">
                  <p className="text-sm">{insights.rarityMetrics.comparisonNote}</p>
                  {insights.rarityMetrics.uniqueTraits.map((trait, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6 mt-6">
            {/* Intelligent Recommendations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Intelligent Recommendations
              </h3>
              
              <div className="space-y-3">
                {insights.intelligentRecommendations.map((rec, index) => (
                  <Card key={index} className={`border ${
                    rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={
                          rec.priority === 'high' ? 'destructive' :
                          rec.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {rec.priority} priority
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{rec.action}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{rec.reasoning}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Timeline:</span>
                        <span className="font-medium">{rec.timeframe}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6 text-center">
                <h4 className="font-semibold mb-2">Continue Your Journey</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Ready to deepen your connection with another session?
                </p>
                <Button className="gap-2">
                  <Heart className="w-4 h-4" />
                  Start New Session
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
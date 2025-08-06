import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  TrendingUp, 
  Heart, 
  Users, 
  Eye, 
  Sparkles, 
  Target, 
  Award, 
  BarChart3,
  Lightbulb,
  ArrowRight,
  Info,
  Trophy,
  Star,
  Zap
} from 'lucide-react';
import { useConnectionInsights } from '@/hooks/useConnectionInsights';
import { useInsightsBenchmarks } from '@/hooks/useInsightsBenchmarks';

const ConnectionInsights = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  
  const { data: insights, isLoading, error, refetch } = useConnectionInsights(searchCode);
  const { data: benchmarks } = useInsightsBenchmarks();

  const handleSearch = () => {
    if (roomCode.trim()) {
      setSearchCode(roomCode.trim().toUpperCase());
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Connection Insights
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover your relationship patterns, compare with other couples, and unlock insights to deepen your connection
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Your Session Insights
            </CardTitle>
            <CardDescription>
              Enter your room code to view your detailed relationship analysis and see how you compare with other couples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter room code (e.g., ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="flex-1 text-center font-mono text-lg"
                maxLength={6}
              />
              <Button 
                onClick={handleSearch}
                disabled={!roomCode.trim() || isLoading}
                className="px-8"
              >
                {isLoading ? 'Searching...' : 'Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              No analysis found for room code "{searchCode}". Make sure you completed a session with AI analysis enabled.
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {insights && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {insights.compatibilityScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Compatibility</div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1 capitalize">
                    {insights.relationshipPhase}
                  </div>
                  <div className="text-sm text-muted-foreground">Phase</div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {benchmarks?.percentile || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Percentile</div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {insights.strengthAreas?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Strengths</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="comparison">Compare</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="growth">Growth</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6">
                {/* Strength Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      Your Relationship Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {insights.strengthAreas?.map((strength, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{strength.area}</span>
                          <Badge variant="secondary">{strength.score}/5</Badge>
                        </div>
                        <Progress value={strength.score * 20} className="h-2" />
                        <p className="text-sm text-muted-foreground">{strength.insight}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Growth Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-secondary" />
                      Areas for Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {insights.growthAreas?.map((growth, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{growth.area}</span>
                          <Badge variant="outline">{growth.score}/5</Badge>
                        </div>
                        <Progress value={growth.score * 20} className="h-2" />
                        <p className="text-sm text-muted-foreground">{growth.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      How You Compare
                    </CardTitle>
                    <CardDescription>
                      See how your relationship metrics compare with other couples in similar phases
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {benchmarks && (
                      <>
                        <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
                          <div className="text-3xl font-bold text-foreground mb-2">
                            {benchmarks.percentile}th
                          </div>
                          <div className="text-sm text-muted-foreground">
                            You're performing better than {benchmarks.percentile}% of couples in the {insights.relationshipPhase} phase
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-medium">Average Scores Comparison</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Your Score</span>
                                <span className="font-medium">{insights.compatibilityScore}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Phase Average</span>
                                <span>{benchmarks.phaseAverage}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Global Average</span>
                                <span>{benchmarks.globalAverage}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium">Relationship Phase</h4>
                            <div className="space-y-2">
                              <Badge variant="secondary" className="w-full justify-center py-2">
                                {insights.relationshipPhase}
                              </Badge>
                              <p className="text-xs text-muted-foreground text-center">
                                Most couples spend 2-4 sessions in this phase
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.keyInsights?.map((insight, index) => (
                        <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/30">
                          <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Cultural Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insights.culturalNotes && (
                      <p className="text-sm text-muted-foreground">{insights.culturalNotes}</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="growth" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Personalized Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.personalizedTips?.map((tip, index) => (
                        <div key={index} className="flex gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                          <Star className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Next Session Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insights.nextSessionRecommendation && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{insights.nextSessionRecommendation}</p>
                        <Button 
                          onClick={() => navigate('/create-room')}
                          className="w-full"
                        >
                          Start New Session
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Educational Content */}
        {!insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Did You Know?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Relationship Phases</h4>
                  <p className="text-sm text-muted-foreground">
                    Most couples go through 4 distinct connection phases: Exploring, Building, Deepening, and Mastering intimacy.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">AI Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Our AI analyzes communication patterns, emotional responses, and compatibility indicators to provide personalized guidance.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Global Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Average Compatibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Couples who complete 3+ sessions show a 73% average compatibility score.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Growth Patterns</h4>
                  <p className="text-sm text-muted-foreground">
                    85% of couples see improvement in intimacy scores after their second session.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionInsights;
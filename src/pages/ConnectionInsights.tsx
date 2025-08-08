import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  BarChart3,
  Info,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { useConnectionInsights } from '@/hooks/useConnectionInsights';
import { useInsightsBenchmarks } from '@/hooks/useInsightsBenchmarks';
import { EnhancedHeroSection } from '@/components/insights/EnhancedHeroSection';
import { CompatibilityRadar } from '@/components/insights/CompatibilityRadar';
import { VerticalTimeline } from '@/components/insights/VerticalTimeline';
import { QuestionInsights } from '@/components/insights/QuestionInsights';
import { ResponseTimeAnalytics } from '@/components/insights/ResponseTimeAnalytics';
import { GlobalContextOverview } from '@/components/insights/GlobalContextOverview';
import { UserGrowthHistoryChart } from '@/components/insights/UserGrowthHistoryChart';
import { useRoomAnalytics } from '@/hooks/useRoomAnalytics';
import { PeerContextPanelV2 } from '@/components/insights/PeerContextPanelV2';

const ConnectionInsights = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [searchCode, setSearchCode] = useState('');

  const { data: insights, isLoading, error, refetch } = useConnectionInsights(searchCode);
  const { data: benchmarks } = useInsightsBenchmarks();
  const { data: roomAnalytics } = useRoomAnalytics(searchCode);

  React.useEffect(() => {
    document.title = 'Connection Insights | Let\'s Get Close';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Relationship insights and analysis for your session.');
  }, []);


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
          {/* SEO */}
          {/* Title and description for SEO */}
          {/* Note: Using document directly to avoid extra deps */}
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

        {/* Connection Insights - Complete Experience */}
        {insights && (
          <div className="space-y-12 animate-fade-in">
            {/* Enhanced Hero with dynamic insights */}
            <EnhancedHeroSection insights={insights} analytics={roomAnalytics ?? null} />
            
            {/* Connection Analysis */}
            <CompatibilityRadar insights={insights} analytics={roomAnalytics ?? null} />
            
            {/* Journey Timeline */}
            <VerticalTimeline insights={insights} />
            
            {/* Smart Question Insights */}
            <QuestionInsights analytics={roomAnalytics ?? null} />
            
            {/* Peer Comparison */}
            <PeerContextPanelV2 roomCode={searchCode} />
            
            {/* Analytics & Growth */}
            <ResponseTimeAnalytics roomCode={searchCode} />
            <UserGrowthHistoryChart roomCode={searchCode} />
            
            {/* Global Context */}
            <GlobalContextOverview insights={insights} />
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
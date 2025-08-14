import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Globe,
  Info,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { useConnectionInsights } from '@/hooks/useConnectionInsights';
import { useInsightsBenchmarks } from '@/hooks/useInsightsBenchmarks';
import { useRoomAnalytics } from '@/hooks/useRoomAnalytics';
import { GlobalBenchmarkDashboard } from '@/components/insights/GlobalBenchmarkDashboard';
import { supabase } from '@/integrations/supabase/client';

const ConnectionInsights = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);

  const { data: insights, isLoading, error, refetch } = useConnectionInsights(searchCode);
  const { data: benchmarks } = useInsightsBenchmarks();
  const { data: roomAnalytics } = useRoomAnalytics(searchCode);

  React.useEffect(() => {
    document.title = 'Connection Insights | Let\'s Get Close';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Relationship insights and analysis for your session.');
  }, []);


  const handleSearch = async () => {
    if (roomCode.trim()) {
      const code = roomCode.trim().toUpperCase();
      setSearchCode(code);
      
      // Fetch room ID for the GetClose analysis
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', code)
        .single();
      
      if (room) {
        setRoomId(room.id);
      }
      
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
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Global Insights Dashboard
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Compare your relationship with thousands of couples worldwide. Discover where you stand, 
              what makes you unique, and how you rank in the global relationship landscape.
            </p>
          </div>

        {/* Search Section */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Global Benchmark Analysis
            </CardTitle>
            <CardDescription>
              Enter your room code to see how your relationship compares with global patterns and statistical trends
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
                {isLoading ? 'Searching...' : 'Compare Globally'}
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

        {/* Global Benchmark Experience */}
        {insights && (
          <div className="space-y-12 animate-fade-in">
            <GlobalBenchmarkDashboard 
              insights={insights} 
              roomCode={searchCode}
            />
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
                  <h4 className="font-medium">Global Benchmarks</h4>
                  <p className="text-sm text-muted-foreground">
                    Compare your relationship metrics against thousands of couples worldwide to understand your unique patterns.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Statistical Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Advanced analytics reveal where you rank in compatibility, communication style, and relationship velocity.
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
                  <h4 className="font-medium">Performance Percentiles</h4>
                  <p className="text-sm text-muted-foreground">
                    Top 10% of couples score above 85% compatibility with consistent high honesty and intimacy.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Success Predictors</h4>
                  <p className="text-sm text-muted-foreground">
                    Strong correlation between attraction-intimacy balance and long-term relationship satisfaction.
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
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
      <div className="min-h-screen romantic-background">
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
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {t('insights.title', 'Global Insights Dashboard')}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('insights.subtitle', 'Compare your relationship with thousands of couples worldwide. Discover where you stand, what makes you unique, and how you rank in the global relationship landscape.')}
            </p>
          </div>

        {/* Search Section */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('insights.search.title', 'Global Benchmark Analysis')}
            </CardTitle>
            <CardDescription>
              {t('insights.search.description', 'Enter your room code to see how your relationship compares with global patterns and statistical trends.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder={t('insights.search.placeholder', 'ABC123')}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="w-full sm:flex-1 text-center font-mono text-lg tracking-widest"
                maxLength={6}
              />
              <Button
                onClick={handleSearch}
                disabled={!roomCode.trim() || isLoading}
                className="w-full sm:w-auto sm:px-8 h-11 font-semibold btn-gradient-primary disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:opacity-100"
              >
                {isLoading ? t('insights.search.searching', 'Searching...') : t('insights.search.cta', 'Compare globally')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('insights.notFound', 'No analysis found for room code "{{code}}". Make sure you finished a session with AI analysis enabled.', { code: searchCode })}
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
                  {t('insights.didYouKnow.title', 'Did you know?')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{t('insights.didYouKnow.benchmarks.title', 'Global benchmarks')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('insights.didYouKnow.benchmarks.body', 'Compare your relationship metrics against thousands of couples worldwide to understand your unique patterns.')}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('insights.didYouKnow.analysis.title', 'Statistical analysis')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('insights.didYouKnow.analysis.body', 'Advanced analytics reveal where you rank in compatibility, communication style, and relationship velocity.')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('insights.stats.title', 'Global statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{t('insights.stats.percentiles.title', 'Performance percentiles')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('insights.stats.percentiles.body', 'The top 10% of couples score above 85% compatibility, with consistently high honesty and intimacy.')}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('insights.stats.predictors.title', 'Success predictors')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('insights.stats.predictors.body', 'There is a strong correlation between attraction-intimacy balance and long-term relationship satisfaction.')}
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
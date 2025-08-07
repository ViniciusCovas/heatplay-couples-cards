import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RealTimeOperations } from "@/components/admin/analytics/RealTimeOperations";
import { ContentUserIntelligence } from "@/components/admin/analytics/ContentUserIntelligence";
import { AdvertiserIntelligence } from "@/components/admin/analytics/AdvertiserIntelligence";
import { AIIntelligence } from "@/components/admin/analytics/AIIntelligence";
import { UserReturnAnalytics } from "@/components/admin/analytics/UserReturnAnalytics";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { Activity, Brain, TrendingUp, Loader2, Zap, RotateCcw } from 'lucide-react';

const AdminIntelligence = () => {
  const {
    roomMetrics,
    userAnalytics,
    questionAnalytics,
    revenueAnalytics,
    advertiserMetrics,
    aiAnalytics,
    connectionIntelligence,
    userReturnPatterns,
    loading
  } = useAdminAnalytics();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Loading Intelligence Dashboard</h3>
              <p className="text-muted-foreground">
                Processing analytics data and generating insights...
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Intelligence Dashboard</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive analytics and insights for business intelligence, content optimization, 
            and advertiser partnerships. Real-time data to drive strategic decisions.
          </p>
        </div>

        {/* Key Metrics Overview */}
        <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-center">Platform Overview</CardTitle>
            <CardDescription className="text-center">
              Real-time platform health and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {roomMetrics?.totalRooms.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <Badge variant="secondary" className="text-xs">
                  All Time
                </Badge>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-secondary">
                  {userAnalytics?.totalUsers.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Registered Users</p>
                <Badge variant="secondary" className="text-xs">
                  Growing Daily
                </Badge>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-accent">
                  {questionAnalytics?.topQuestions.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Top Questions</p>
                <Badge variant="secondary" className="text-xs">
                  Most Engaging
                </Badge>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-muted-foreground">
                  ${revenueAnalytics?.totalRevenue.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <Badge variant="secondary" className="text-xs">
                  Lifetime Value
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Content & Users
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Intelligence
            </TabsTrigger>
            <TabsTrigger value="returns" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              User Returns
            </TabsTrigger>
            <TabsTrigger value="advertisers" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Advertisers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6">
            <RealTimeOperations 
              roomMetrics={roomMetrics}
              userAnalytics={userAnalytics}
            />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <ContentUserIntelligence 
              questionAnalytics={questionAnalytics}
              userAnalytics={userAnalytics}
            />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIIntelligence 
              aiAnalytics={aiAnalytics}
              connectionIntelligence={connectionIntelligence}
            />
          </TabsContent>

          <TabsContent value="returns" className="space-y-6">
            <UserReturnAnalytics 
              userReturnPatterns={userReturnPatterns}
            />
          </TabsContent>

          <TabsContent value="advertisers" className="space-y-6">
            <AdvertiserIntelligence 
              advertiserMetrics={advertiserMetrics}
              revenueAnalytics={revenueAnalytics}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminIntelligence;
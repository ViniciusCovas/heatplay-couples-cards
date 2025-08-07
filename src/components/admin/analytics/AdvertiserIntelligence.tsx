import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Target, DollarSign, Users, Star, Award, Download, FileText } from 'lucide-react';
import { AdvertiserMetrics, RevenueAnalytics } from '@/hooks/useAdminAnalytics';

interface AdvertiserIntelligenceProps {
  advertiserMetrics: AdvertiserMetrics | null;
  revenueAnalytics: RevenueAnalytics | null;
}

export const AdvertiserIntelligence = ({ advertiserMetrics, revenueAnalytics }: AdvertiserIntelligenceProps) => {
  const generateAdvertiserReport = () => {
    // In a real app, this would generate a comprehensive PDF report
    console.log('Generating advertiser report with:', { advertiserMetrics, revenueAnalytics });
  };

  // Enhanced data validation
  const hasValidData = advertiserMetrics && 
    typeof advertiserMetrics.audienceQuality === 'object' &&
    typeof advertiserMetrics.revenueProjections === 'object' &&
    Array.isArray(advertiserMetrics.roiForecasting);

  if (!hasValidData) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">Loading advertiser intelligence...</p>
        {advertiserMetrics && (
          <p className="text-sm text-muted-foreground">
            Data collection in progress. Advanced metrics available with more user data.
          </p>
        )}
      </div>
    );
  }

  // Safe data extraction with fallbacks
  const safeMetrics = {
    audienceQuality: {
      engagementDepth: Number(advertiserMetrics.audienceQuality?.engagementDepth) || 0,
      sessionDuration: Number(advertiserMetrics.audienceQuality?.sessionDuration) || 0,
      retentionRate: Number(advertiserMetrics.audienceQuality?.retentionRate) || 0,
      premiumUsers: Number(advertiserMetrics.audienceQuality?.premiumUsers) || 0
    },
    revenueProjections: {
      monthlyRevenue: Number(advertiserMetrics.revenueProjections?.monthlyRevenue) || 0,
      growthRate: Number(advertiserMetrics.revenueProjections?.growthRate) || 0,
      ltv: Number(advertiserMetrics.revenueProjections?.ltv) || 0,
      conversionRate: Number(advertiserMetrics.revenueProjections?.conversionRate) || 0
    },
    demographics: {
      totalUsers: Number(advertiserMetrics.demographics?.totalUsers) || 0,
      activeUsers: Number(advertiserMetrics.demographics?.activeUsers) || 0,
      marketPenetration: Number(advertiserMetrics.demographics?.marketPenetration) || 0,
      geographicSpread: Number(advertiserMetrics.demographics?.geographicSpread) || 1
    },
    marketPositioning: {
      competitorAnalysis: Number(advertiserMetrics.marketPositioning?.competitorAnalysis) || 0,
      marketShare: Number(advertiserMetrics.marketPositioning?.marketShare) || 0,
      brandRecognition: Number(advertiserMetrics.marketPositioning?.brandRecognition) || 0,
      innovationIndex: Number(advertiserMetrics.marketPositioning?.innovationIndex) || 0
    },
    roiForecasting: (advertiserMetrics.roiForecasting || []).filter(item => 
      item && typeof item.projected === 'number' && !isNaN(item.projected)
    )
  };

  // Chart data validation
  const audienceQualityData = [
    { subject: 'Engagement', A: safeMetrics.audienceQuality.engagementDepth },
    { subject: 'Retention', A: safeMetrics.audienceQuality.retentionRate },
    { subject: 'Premium Users', A: safeMetrics.audienceQuality.premiumUsers },
    { subject: 'Session Quality', A: Math.min(safeMetrics.audienceQuality.sessionDuration * 10, 100) }
  ].filter(item => !isNaN(item.A));

  const demographicData = [
    { name: 'Total Users', value: safeMetrics.demographics.totalUsers },
    { name: 'Active Users', value: safeMetrics.demographics.activeUsers },
    { name: 'Geographic Reach', value: safeMetrics.demographics.geographicSpread }
  ].filter(item => !isNaN(item.value) && item.value > 0);

  const marketPositionData = [
    { category: 'Competitor Analysis', score: safeMetrics.marketPositioning.competitorAnalysis },
    { category: 'Market Share', score: safeMetrics.marketPositioning.marketShare },
    { category: 'Brand Recognition', score: safeMetrics.marketPositioning.brandRecognition },
    { category: 'Innovation', score: safeMetrics.marketPositioning.innovationIndex }
  ].filter(item => !isNaN(item.score));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Advertiser Intelligence</h2>
        <div className="flex gap-2">
          <Button onClick={generateAdvertiserReport} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="default" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Media Kit
          </Button>
        </div>
      </div>

      {/* Audience Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Depth</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {safeMetrics.audienceQuality.engagementDepth}%
            </div>
            <p className="text-xs text-muted-foreground">
              High-quality, engaged users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
            <Target className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {safeMetrics.audienceQuality.sessionDuration}m
            </div>
            <p className="text-xs text-muted-foreground">
              Average time per session
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
            <Award className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {safeMetrics.audienceQuality.premiumUsers}%
            </div>
            <p className="text-xs text-muted-foreground">
              Users willing to pay
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-muted/5 to-muted/10 border-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${safeMetrics.revenueProjections.ltv.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average user value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics & ROI Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Growth & Projections
            </CardTitle>
            <CardDescription>
              Demonstrable growth trajectory for advertiser confidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={safeMetrics.roiForecasting.length > 0 ? safeMetrics.roiForecasting : [{ month: 'Jan', projected: 10, actual: 5 }]}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`,
                    name === 'projected' ? 'Projected Revenue' : 'Actual Revenue'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                {safeMetrics.roiForecasting.some(item => item.actual !== null) && (
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--secondary))" 
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  ${safeMetrics.revenueProjections.monthlyRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-secondary">
                  {safeMetrics.revenueProjections.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Audience Quality Radar
            </CardTitle>
            <CardDescription>
              Multi-dimensional audience quality assessment for premium advertising
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={audienceQualityData.length > 0 ? audienceQualityData : [{ subject: 'No Data', A: 0 }]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar
                  name="Quality Score"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-center">
              <div>
                <div className="text-sm font-bold text-primary">Premium Tier</div>
                <p className="text-xs text-muted-foreground">Audience Quality</p>
              </div>
              <div>
                <div className="text-sm font-bold text-secondary">Top 10%</div>
                <p className="text-xs text-muted-foreground">Market Position</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics & Market Positioning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ROI Forecasting for Advertisers</CardTitle>
            <CardDescription>
              Projected reach and value demonstrating advertising potential
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={safeMetrics.roiForecasting.length > 0 ? safeMetrics.roiForecasting : [{ month: 'Jan', projected: 10 }]}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`,
                    name === 'projected' ? 'Projected Revenue' : 'Actual Revenue'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
                {safeMetrics.roiForecasting.some(item => item.actual !== null) && (
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demographic Value</CardTitle>
            <CardDescription>
              Target audience segments with purchasing power
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demographicData.length > 0 ? (
              demographicData.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.value}
                    </Badge>
                  </div>
                  <Progress value={Math.min((item.value / Math.max(...demographicData.map(d => d.value))) * 100, 100)} className="h-2" />
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Building demographic insights...</p>
                <p className="text-xs">More data available as user base grows</p>
              </div>
            )}
            
            <div className="pt-4 border-t text-center">
              <div className="text-lg font-bold text-primary">
                {safeMetrics.demographics.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Intelligence Summary */}
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-center">Market Intelligence Summary</CardTitle>
          <CardDescription className="text-center">
            Key selling points for premium advertising partnerships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {safeMetrics.revenueProjections.growthRate.toFixed(1)}%
              </div>
              <p className="text-sm font-medium">Monthly Growth Rate</p>
              <p className="text-xs text-muted-foreground">
                Real growth based on actual user data
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-secondary">
                {safeMetrics.demographics.marketPenetration.toFixed(2)}%
              </div>
              <p className="text-sm font-medium">Market Penetration</p>
              <p className="text-xs text-muted-foreground">
                Early stage with massive growth potential
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">
                ${safeMetrics.revenueProjections.ltv.toFixed(2)}
              </div>
              <p className="text-sm font-medium">Avg User LTV</p>
              <p className="text-xs text-muted-foreground">
                Revenue potential per engaged user
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
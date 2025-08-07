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

  const audienceQualityData = advertiserMetrics ? [
    { metric: 'Engagement', value: advertiserMetrics.audienceQuality.engagementDepth, fullMark: 100 },
    { metric: 'Retention', value: advertiserMetrics.audienceQuality.retentionRate, fullMark: 100 },
    { metric: 'Session Duration', value: (advertiserMetrics.audienceQuality.sessionDuration / 30) * 100, fullMark: 100 },
    { metric: 'Premium Users', value: advertiserMetrics.audienceQuality.premiumUserPercentage * 4, fullMark: 100 },
  ] : [];

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
              {advertiserMetrics?.audienceQuality.engagementDepth}%
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
              {advertiserMetrics?.audienceQuality.sessionDuration}m
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
              {advertiserMetrics?.audienceQuality.premiumUserPercentage || 0}%
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
              ${revenueAnalytics?.lifetimeValue.toFixed(2)}
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
              <AreaChart data={revenueAnalytics?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(month) => new Date(month).toLocaleDateString('en-US', { month: 'short' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(month) => new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  formatter={(value, name) => [
                    name === 'amount' ? `$${value.toLocaleString()}` : value,
                    name === 'amount' ? 'Revenue' : 'Sessions'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  ${revenueAnalytics?.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-secondary">
                  {revenueAnalytics?.conversionRate}%
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
              <RadarChart data={audienceQualityData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar
                  name="Quality Score"
                  dataKey="value"
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
              <LineChart data={advertiserMetrics?.roiForecasting || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(month) => new Date(month).toLocaleDateString('en-US', { month: 'short' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(month) => new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  formatter={(value, name) => [
                    name === 'projectedReach' ? value.toLocaleString() : `$${value.toLocaleString()}`,
                    name === 'projectedReach' ? 'Projected Reach' : 'Estimated Value'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="projectedReach" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  yAxisId="reach"
                />
                <Line 
                  type="monotone" 
                  dataKey="estimatedValue" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  yAxisId="value"
                />
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
            {advertiserMetrics?.demographics.map((segment, index) => (
              <div key={segment.segment} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{segment.segment}</span>
                  <Badge variant="outline" className="text-xs">
                    ${segment.value}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{segment.percentage}% of audience</span>
                  <span>Avg value/user</span>
                </div>
                <Progress value={segment.percentage} className="h-2" />
              </div>
            ))}
            
            <div className="pt-4 border-t text-center">
              <div className="text-lg font-bold text-primary">
                ${advertiserMetrics?.marketPositioning.totalAddressableMarket.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Addressable Market</p>
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
                {advertiserMetrics?.marketPositioning.growthRate}%
              </div>
              <p className="text-sm font-medium">Monthly Growth Rate</p>
              <p className="text-xs text-muted-foreground">
                Consistent, sustainable growth trajectory
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-secondary">
                {((advertiserMetrics?.marketPositioning?.marketPenetration || 0) * 100).toFixed(3)}%
              </div>
              <p className="text-sm font-medium">Market Penetration</p>
              <p className="text-xs text-muted-foreground">
                Massive untapped opportunity for growth
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">
                ${revenueAnalytics?.averageSessionValue.toFixed(2)}
              </div>
              <p className="text-sm font-medium">Avg Session Value</p>
              <p className="text-xs text-muted-foreground">
                High-value user engagement per session
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
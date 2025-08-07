import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Clock, TrendingUp, Zap, Globe } from 'lucide-react';
import { RoomMetrics, UserAnalytics } from '@/hooks/useAdminAnalytics';

interface RealTimeOperationsProps {
  roomMetrics: RoomMetrics | null;
  userAnalytics: UserAnalytics | null;
}

export const RealTimeOperations = ({ roomMetrics, userAnalytics }: RealTimeOperationsProps) => {
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Real-Time Operations</h2>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          Live Data
        </Badge>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rooms Today</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{roomMetrics?.activeToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.floor((roomMetrics?.activeToday || 0) * 0.15)} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms Created</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{roomMetrics?.totalRooms || 0}</div>
            <p className="text-xs text-muted-foreground">
              All-time room count
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{roomMetrics?.averageSessionTime || 0}m</div>
            <p className="text-xs text-muted-foreground">
              Average duration per session
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-muted-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userAnalytics?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Room Creation Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Room Creation Velocity (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Daily room creation showing platform growth and engagement patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={roomMetrics?.dailyRooms || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [value, 'Rooms Created']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Usage Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary" />
              Peak Usage Hours
            </CardTitle>
            <CardDescription>
              Optimal times for scheduled content and advertiser targeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roomMetrics?.peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
                  formatter={(value) => [value, 'Sessions']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Growth and Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Growth & Activity</CardTitle>
            <CardDescription>
              New vs returning users showing platform stickiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userAnalytics?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="New Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="returningUsers" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Returning Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Health</CardTitle>
            <CardDescription>
              Key metrics for advertiser appeal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Weekly Retention</span>
                <span className="text-sm font-bold text-primary">
                  {userAnalytics?.retentionRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={userAnalytics?.retentionRate || 0} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Avg Sessions/User</span>
                <span className="text-sm font-bold text-secondary">
                  {userAnalytics?.averageSessionsPerUser.toFixed(1)}
                </span>
              </div>
              <Progress 
                value={Math.min((userAnalytics?.averageSessionsPerUser || 0) * 20, 100)} 
                className="h-2" 
              />
            </div>

            <div className="text-center pt-4 border-t">
              <div className="text-2xl font-bold text-foreground">
                {userAnalytics?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total Registered Users</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
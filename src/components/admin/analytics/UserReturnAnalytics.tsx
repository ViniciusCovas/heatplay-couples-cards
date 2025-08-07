import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { RotateCcw, Users, Calendar, TrendingDown } from 'lucide-react';
import { UserReturnPatterns } from '@/hooks/useAdminAnalytics';

interface UserReturnAnalyticsProps {
  userReturnPatterns: UserReturnPatterns | null;
}

export const UserReturnAnalytics = ({ userReturnPatterns }: UserReturnAnalyticsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <RotateCcw className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">User Return Pattern Analytics</h2>
      </div>

      {/* Return Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Return Time Distribution
            </CardTitle>
            <CardDescription>
              How quickly users return to start new sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userReturnPatterns?.returnTimeDistribution && userReturnPatterns.returnTimeDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={userReturnPatterns.returnTimeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="range" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {userReturnPatterns.returnTimeDistribution.map((timeRange) => (
                    <div key={timeRange.range} className="flex justify-between items-center py-1">
                      <span className="text-sm">{timeRange.range}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{timeRange.count} users</Badge>
                        <span className="text-xs text-muted-foreground">({timeRange.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No return time data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Routine Integration Score
            </CardTitle>
            <CardDescription>
              How well the app integrates into users' routines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-primary">
                {userReturnPatterns?.routineIntegrationScore || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                Users with routine usage patterns
              </p>
              
              <Progress 
                value={userReturnPatterns?.routineIntegrationScore || 0} 
                className="h-3"
              />
              
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Routine users are defined as having 3+ sessions with regular frequency
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">Daily</div>
                    <p className="text-xs text-muted-foreground">High Routine</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-secondary">Weekly</div>
                    <p className="text-xs text-muted-foreground">Regular Use</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-accent">Monthly</div>
                    <p className="text-xs text-muted-foreground">Occasional</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Cohorts & Engagement Decay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Retention Cohort Analysis</CardTitle>
            <CardDescription>
              User retention patterns over time by signup week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userReturnPatterns?.retentionCohorts && userReturnPatterns.retentionCohorts.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground">
                  <span>Cohort</span>
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 4</span>
                  <span>Week 8</span>
                </div>
                
                {userReturnPatterns.retentionCohorts.map((cohort) => (
                  <div key={cohort.cohort} className="grid grid-cols-5 gap-2 text-sm">
                    <span className="font-medium">{cohort.cohort}</span>
                    <Badge variant="outline" className="text-xs">{cohort.week1}%</Badge>
                    <Badge variant="outline" className="text-xs">{cohort.week2}%</Badge>
                    <Badge variant="outline" className="text-xs">{cohort.week4}%</Badge>
                    <Badge variant="outline" className="text-xs">{cohort.week8}%</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No cohort data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-accent" />
              Engagement Decay Analysis
            </CardTitle>
            <CardDescription>
              Probability of user return over time since first session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userReturnPatterns?.engagementDecay && userReturnPatterns.engagementDecay.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={userReturnPatterns.engagementDecay}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="daysAfterFirst" 
                      tickFormatter={(days) => `Day ${days}`}
                      className="text-xs"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      className="text-xs"
                    />
                    <Tooltip 
                      labelFormatter={(days) => `${days} days after first session`}
                      formatter={(value) => [`${value}%`, 'Return Probability']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="returnProbability" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">
                      Day 1: {userReturnPatterns.engagementDecay[0]?.returnProbability || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Initial Retention</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-accent">
                      Day 30: {userReturnPatterns.engagementDecay[userReturnPatterns.engagementDecay.length - 1]?.returnProbability || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Long-term Retention</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No engagement decay data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
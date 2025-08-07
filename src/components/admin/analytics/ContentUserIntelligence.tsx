import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MessageSquare, Target, Clock, Heart, Download, Eye } from 'lucide-react';
import { QuestionAnalytics, UserAnalytics } from '@/hooks/useAdminAnalytics';

interface ContentUserIntelligenceProps {
  questionAnalytics: QuestionAnalytics | null;
  userAnalytics: UserAnalytics | null;
}

export const ContentUserIntelligence = ({ questionAnalytics, userAnalytics }: ContentUserIntelligenceProps) => {
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const exportQuestionData = () => {
    const data = questionAnalytics?.topQuestions.map(q => ({
      Question: q.text,
      TimesShown: q.timesShown,
      AvgResponseTime: `${q.avgResponseTime.toFixed(1)}s`,
      AvgHonestyScore: q.avgHonestyScore.toFixed(1),
      Level: q.level,
      Language: q.language
    }));
    
    // In a real app, this would trigger a CSV/Excel download
    console.log('Exporting question data:', data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Content & User Intelligence</h2>
        <Button onClick={exportQuestionData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Top Questions Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Question Performance Rankings
          </CardTitle>
          <CardDescription>
            Most engaging questions ranked by usage, response time, and honesty scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questionAnalytics?.topQuestions && questionAnalytics.topQuestions.length > 0 ? (
              questionAnalytics.topQuestions.slice(0, 8).map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.language.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {question.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-bold">{question.timesShown}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className="font-medium">{question.avgResponseTime.toFixed(1)}s</span>
                      </div>
                      <Progress 
                        value={Math.min(question.avgResponseTime * 2, 100)} 
                        className="h-1" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Honesty Score</span>
                        <span className="font-medium">
                          {question.avgHonestyScore > 0 ? question.avgHonestyScore.toFixed(1) : 'N/A'}/5
                        </span>
                      </div>
                      <Progress 
                        value={question.avgHonestyScore > 0 ? (question.avgHonestyScore / 5) * 100 : 0} 
                        className="h-1" 
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Question Data Available</p>
                <p className="text-sm">Questions will appear here once users start playing games</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              Language Distribution
            </CardTitle>
            <CardDescription>
              Geographic market insights for targeted advertising
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={questionAnalytics?.languageDistribution || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                    label={({ language, percentage }) => `${language}: ${percentage.toFixed(1)}%`}
                  >
                    {(questionAnalytics?.languageDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-2">
                {questionAnalytics?.languageDistribution.map((lang, index) => (
                  <div key={lang.language} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">
                        {lang.language === 'en' ? 'English' : 
                         lang.language === 'es' ? 'Spanish' :
                         lang.language === 'fr' ? 'French' : 
                         lang.language === 'pt' ? 'Portuguese' : lang.language}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{lang.count}</div>
                      <div className="text-xs text-muted-foreground">{lang.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level Popularity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              Intimacy Level Preferences
            </CardTitle>
            <CardDescription>
              User engagement by relationship depth - valuable for premium positioning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={questionAnalytics?.levelPopularity || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="level" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'sessions' ? `${value} sessions` : `${typeof value === 'number' ? value.toFixed(1) : value} min`,
                    name === 'sessions' ? 'Total Sessions' : 'Avg Duration'
                  ]}
                />
                <Bar 
                  dataKey="sessions" 
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Response Time Distribution
            </CardTitle>
            <CardDescription>
              User engagement depth analysis - faster responses indicate surface-level thinking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={questionAnalytics?.responseTimeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value) => [`${value} responses`, 'Count']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Cohort Analysis</CardTitle>
            <CardDescription>
              Retention patterns showing long-term value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="text-2xl font-bold text-primary">
                {userAnalytics?.totalUsers || 0}
              </div>
              <p className="text-sm text-muted-foreground mb-4">Total Registered Users</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Active Users (7d)</span>
                    <span className="font-medium">{userAnalytics?.activeUsers || 0}</span>
                  </div>
                  <Progress 
                    value={userAnalytics?.retentionRate || 0} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {userAnalytics?.retentionRate.toFixed(1)}% retention rate
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Avg Sessions/User</span>
                    <span className="font-medium">{userAnalytics?.averageSessionsPerUser.toFixed(1)}</span>
                  </div>
                  <Progress 
                    value={Math.min((userAnalytics?.averageSessionsPerUser || 0) * 20, 100)} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
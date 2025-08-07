import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MessageSquare, Target, Clock, Heart, Download, Eye, Search, TrendingUp, Brain } from 'lucide-react';
import { QuestionAnalytics, UserAnalytics } from '@/hooks/useAdminAnalytics';
import { useState } from 'react';

interface EnhancedContentUserIntelligenceProps {
  questionAnalytics: QuestionAnalytics | null;
  userAnalytics: UserAnalytics | null;
}

export const EnhancedContentUserIntelligence = ({ questionAnalytics, userAnalytics }: EnhancedContentUserIntelligenceProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];
  const PILLAR_COLORS = {
    honesty: '#3B82F6', // blue
    attraction: '#EC4899', // pink  
    intimacy: '#8B5CF6', // purple
    surprise: '#F97316' // orange
  };

  const filteredQuestions = questionAnalytics?.topQuestions.filter(q => 
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const radarData = questionAnalytics?.evaluationAverages ? [
    {
      subject: 'Honesty',
      score: questionAnalytics.evaluationAverages.honesty,
      fullMark: 5
    },
    {
      subject: 'Attraction', 
      score: questionAnalytics.evaluationAverages.attraction,
      fullMark: 5
    },
    {
      subject: 'Intimacy',
      score: questionAnalytics.evaluationAverages.intimacy,
      fullMark: 5
    },
    {
      subject: 'Surprise',
      score: questionAnalytics.evaluationAverages.surprise,
      fullMark: 5
    }
  ] : [];

  const exportQuestionData = () => {
    const data = filteredQuestions.map(q => ({
      Question: q.text,
      TimesShown: q.timesShown,
      AvgResponseTime: `${q.avgResponseTime.toFixed(1)}s`,
      AvgHonestyScore: q.avgHonestyScore.toFixed(1),
      AvgAttractionScore: q.avgAttractionScore.toFixed(1),
      AvgIntimacyScore: q.avgIntimacyScore.toFixed(1),
      AvgSurpriseScore: q.avgSurpriseScore.toFixed(1),
      Level: q.level,
      Language: q.language
    }));
    
    console.log('Exporting enhanced question data:', data);
  };

  const openQuestionModal = (question: any) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Enhanced Content & User Intelligence</h2>
        <Button onClick={exportQuestionData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Global Evaluation Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Global Evaluation Analytics
            </CardTitle>
            <CardDescription>
              Average scores across all evaluation pillars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 5]} 
                    tick={{ fontSize: 12 }}
                  />
                  <Radar
                    name="Average Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}/5`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Pillar Performance Breakdown
            </CardTitle>
            <CardDescription>
              Detailed breakdown of each evaluation category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionAnalytics?.evaluationAverages && Object.entries(questionAnalytics.evaluationAverages).map(([pillar, score]) => (
              <div key={pillar}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{pillar}</span>
                  <span className="text-sm font-bold">{Number(score).toFixed(1)}/5</span>
                </div>
                <Progress 
                  value={(Number(score) / 5) * 100} 
                  className="h-2"
                  style={{ 
                    '--progress-foreground': PILLAR_COLORS[pillar as keyof typeof PILLAR_COLORS] 
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Question Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Question Search & Deep Insights
          </CardTitle>
          <CardDescription>
            Search for specific questions and get detailed analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search questions by content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="space-y-4">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.slice(0, 10).map((question, index) => (
                <div 
                  key={question.id} 
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openQuestionModal(question)}
                >
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
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">🔵 Honesty</span>
                        <span className="font-medium">
                          {question.avgHonestyScore > 0 ? question.avgHonestyScore.toFixed(1) : 'N/A'}/5
                        </span>
                      </div>
                      <Progress 
                        value={question.avgHonestyScore > 0 ? (question.avgHonestyScore / 5) * 100 : 0} 
                        className="h-1" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">🩷 Attraction</span>
                        <span className="font-medium">
                          {question.avgAttractionScore > 0 ? question.avgAttractionScore.toFixed(1) : 'N/A'}/5
                        </span>
                      </div>
                      <Progress 
                        value={question.avgAttractionScore > 0 ? (question.avgAttractionScore / 5) * 100 : 0} 
                        className="h-1" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">🟣 Intimacy</span>
                        <span className="font-medium">
                          {question.avgIntimacyScore > 0 ? question.avgIntimacyScore.toFixed(1) : 'N/A'}/5
                        </span>
                      </div>
                      <Progress 
                        value={question.avgIntimacyScore > 0 ? (question.avgIntimacyScore / 5) * 100 : 0} 
                        className="h-1" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">🟠 Surprise</span>
                        <span className="font-medium">
                          {question.avgSurpriseScore > 0 ? question.avgSurpriseScore.toFixed(1) : 'N/A'}/5
                        </span>
                      </div>
                      <Progress 
                        value={question.avgSurpriseScore > 0 ? (question.avgSurpriseScore / 5) * 100 : 0} 
                        className="h-1" 
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {searchQuery ? 'No matching questions found' : 'No Question Data Available'}
                </p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search terms' : 'Questions will appear here once users start playing games'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Detail Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Deep Insights</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Question Text</h3>
                <p className="text-sm">{selectedQuestion.text}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline">{selectedQuestion.level}</Badge>
                  <Badge variant="outline">{selectedQuestion.language.toUpperCase()}</Badge>
                  <Badge variant="secondary">Shown {selectedQuestion.timesShown} times</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Response Time</span>
                      <span className="font-medium">{selectedQuestion.avgResponseTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Times Shown</span>
                      <span className="font-medium">{selectedQuestion.timesShown}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Evaluation Scores</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Honesty', score: selectedQuestion.avgHonestyScore, color: '#3B82F6' },
                      { name: 'Attraction', score: selectedQuestion.avgAttractionScore, color: '#EC4899' },
                      { name: 'Intimacy', score: selectedQuestion.avgIntimacyScore, color: '#8B5CF6' },
                      { name: 'Surprise', score: selectedQuestion.avgSurpriseScore, color: '#F97316' }
                    ].map(pillar => (
                      <div key={pillar.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{pillar.name}</span>
                          <span className="font-medium">
                            {pillar.score > 0 ? pillar.score.toFixed(1) : 'N/A'}/5
                          </span>
                        </div>
                        <Progress 
                          value={pillar.score > 0 ? (pillar.score / 5) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-2">AI Insights</h4>
                <p className="text-sm text-muted-foreground">
                  This question performs {selectedQuestion.avgHonestyScore > 3.5 ? 'excellently' : selectedQuestion.avgHonestyScore > 2.5 ? 'well' : 'moderately'} in driving honest responses 
                  and shows {selectedQuestion.avgResponseTime > 30 ? 'thoughtful' : 'quick'} response patterns.
                  {selectedQuestion.avgAttractionScore > 3.5 && ' It particularly excels at building romantic attraction.'}
                  {selectedQuestion.avgIntimacyScore > 3.5 && ' It creates strong emotional intimacy.'}
                  {selectedQuestion.avgSurpriseScore > 3.5 && ' It consistently surprises users with unexpected insights.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Legacy Analytics Grid */}
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
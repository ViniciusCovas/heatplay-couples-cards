import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { Brain, Target, TrendingUp, Zap } from 'lucide-react';
import { AIAnalytics, ConnectionIntelligence } from '@/hooks/useAdminAnalytics';

interface AIIntelligenceProps {
  aiAnalytics: AIAnalytics | null;
  connectionIntelligence: ConnectionIntelligence | null;
}

export const AIIntelligence = ({ aiAnalytics, connectionIntelligence }: AIIntelligenceProps) => {
  const categoryColors = {
    'Intimacy': 'hsl(var(--primary))',
    'Attraction': '#ec4899',
    'Surprise': 'hsl(var(--accent))',
    'Honesty': 'hsl(var(--secondary))'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">GetClose AI Intelligence</h2>
      </div>

      {/* AI Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              AI Category Distribution
            </CardTitle>
            <CardDescription>
              What relationship areas GetClose AI focuses on most
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aiAnalytics?.categoryDistribution && aiAnalytics.categoryDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={aiAnalytics.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {aiAnalytics.categoryDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={categoryColors[entry.category as keyof typeof categoryColors] || 'hsl(var(--muted))'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} selections`, props.payload.category]} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {aiAnalytics.categoryDistribution.map((category) => (
                    <div key={category.category} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: categoryColors[category.category as keyof typeof categoryColors] }}
                      />
                      <span className="text-sm">{category.category}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {category.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No AI category data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              AI Performance Metrics
            </CardTitle>
            <CardDescription>
              GetClose AI effectiveness and intelligence insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {aiAnalytics?.performanceMetrics.aiVsRandomSuccess || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">AI vs Random Success</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {aiAnalytics?.performanceMetrics.avgReasoningLength || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Reasoning Length</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Most Common Target Area</p>
                <Badge variant="outline" className="w-full justify-center py-2">
                  {aiAnalytics?.performanceMetrics.mostCommonTargetArea || 'N/A'}
                </Badge>
              </div>

              {aiAnalytics?.reasoningAnalysis && aiAnalytics.reasoningAnalysis.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Top AI Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {aiAnalytics.reasoningAnalysis.slice(0, 6).map((keyword) => (
                      <Badge key={keyword.keyword} variant="secondary" className="text-xs">
                        {keyword.keyword} ({keyword.frequency})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Intelligence Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Compatibility</CardTitle>
            <CardDescription>
              Average compatibility scores across all couples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-primary">
                {connectionIntelligence?.globalCompatibility.averageScore || 0}%
              </div>
              <p className="text-sm text-muted-foreground">Average Compatibility</p>
              
              {connectionIntelligence?.globalCompatibility.distribution && (
                <div className="space-y-2">
                  {connectionIntelligence.globalCompatibility.distribution.map((dist) => (
                    <div key={dist.range} className="flex justify-between text-xs">
                      <span>{dist.range}</span>
                      <Badge variant="outline">{dist.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationship Phases</CardTitle>
            <CardDescription>
              Distribution of couples across relationship phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionIntelligence?.relationshipPhases && connectionIntelligence.relationshipPhases.length > 0 ? (
              <div className="space-y-3">
                {connectionIntelligence.relationshipPhases.map((phase) => (
                  <div key={phase.phase} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{phase.phase}</span>
                      <span>{phase.percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${phase.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No relationship phase data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Growth Areas</CardTitle>
            <CardDescription>
              Most frequent areas couples want to improve
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionIntelligence?.commonGrowthAreas && connectionIntelligence.commonGrowthAreas.length > 0 ? (
              <div className="space-y-3">
                {connectionIntelligence.commonGrowthAreas.slice(0, 5).map((area) => (
                  <div key={area.area} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{area.area}</p>
                      <p className="text-xs text-muted-foreground">
                        {area.avgImprovement}% avg improvement
                      </p>
                    </div>
                    <Badge variant="outline">{area.frequency}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No growth area data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Patterns */}
      {connectionIntelligence?.successPatterns && connectionIntelligence.successPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Success Pattern Recognition
            </CardTitle>
            <CardDescription>
              Patterns that correlate with successful relationship outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectionIntelligence.successPatterns.map((pattern) => (
                <div key={pattern.pattern} className="space-y-2 p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{pattern.pattern}</h4>
                    <Badge variant="secondary">{Math.round(pattern.correlation * 100)}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
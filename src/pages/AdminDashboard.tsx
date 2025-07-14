import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Settings, Upload, Plus, FileText, Database, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LevelStats {
  id: string;
  name: string;
  question_count: number;
  color?: string;
  icon?: string;
}

interface QuestionStats {
  total: number;
  byLevel: LevelStats[];
  recent: Array<{
    id: string;
    text: string;
    level_name: string;
    created_at: string;
  }>;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<QuestionStats>({
    total: 0,
    byLevel: [],
    recent: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total questions count
      const { count: totalCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get levels with question counts
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (levelsError) throw levelsError;

      const levelsWithCounts = await Promise.all(
        (levels || []).map(async (level) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('level_id', level.id)
            .eq('is_active', true);

          return {
            ...level,
            question_count: count || 0
          };
        })
      );

      // Get recent questions
      const { data: recentQuestions, error: recentError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          created_at,
          levels (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const recent = (recentQuestions || []).map(q => ({
        id: q.id,
        text: q.text,
        level_name: (q.levels as any)?.name || 'Sin nivel',
        created_at: q.created_at
      }));

      setStats({
        total: totalCount || 0,
        byLevel: levelsWithCounts,
        recent
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Gestionar Niveles",
      description: "Crear, editar y organizar niveles del juego",
      icon: Settings,
      href: "/admin/levels",
      color: "text-blue-500"
    },
    {
      title: "Subir Preguntas",
      description: "Cargar preguntas masivamente desde CSV",
      icon: Upload,
      href: "/admin/questions-bulk",
      color: "text-green-500"
    },
    {
      title: "Añadir Preguntas",
      description: "Crear preguntas individuales manualmente",
      icon: Plus,
      href: "/admin/questions-manual",
      color: "text-purple-500"
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Preguntas</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Preguntas activas en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Niveles Activos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.byLevel.length}</div>
              <p className="text-xs text-muted-foreground">
                Niveles configurados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Nivel</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.byLevel.length > 0 ? Math.round(stats.total / stats.byLevel.length) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Preguntas por nivel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Últimas Agregadas</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.recent.length}</div>
              <p className="text-xs text-muted-foreground">
                En las últimas 5 adiciones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-6 w-6 ${action.color}`} />
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to={action.href}>
                        Ir a {action.title}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Levels Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Preguntas por Nivel</CardTitle>
            <CardDescription>
              Cantidad de preguntas disponibles en cada nivel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.byLevel.map((level) => {
              const percentage = stats.total > 0 ? (level.question_count / stats.total) * 100 : 0;
              return (
                <div key={level.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{level.name}</span>
                      <Badge variant="secondary">{level.question_count} preguntas</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percentage} className="w-full" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Preguntas Recientes</CardTitle>
            <CardDescription>
              Últimas preguntas agregadas al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recent.length > 0 ? (
              <div className="space-y-4">
                {stats.recent.map((question) => (
                  <div key={question.id} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {question.text}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {question.level_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(question.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay preguntas recientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
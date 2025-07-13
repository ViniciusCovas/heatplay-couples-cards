import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Level {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  sort_order: number;
  is_active: boolean;
  question_count?: number;
}

interface LevelFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  bg_color: string;
}

export default function AdminLevels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [formData, setFormData] = useState<LevelFormData>({
    name: "",
    description: "",
    icon: "",
    color: "",
    bg_color: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .order('sort_order');

      if (levelsError) throw levelsError;

      // Get question counts for each level
      const levelsWithCounts = await Promise.all(
        levelsData.map(async (level) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('level_id', level.id)
            .eq('is_active', true);

          return { ...level, question_count: count || 0 };
        })
      );

      setLevels(levelsWithCounts);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los niveles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLevel) {
        // Update existing level
        const { error } = await supabase
          .from('levels')
          .update(formData)
          .eq('id', editingLevel.id);

        if (error) throw error;

        toast({
          title: "Nivel actualizado",
          description: "El nivel se ha actualizado correctamente",
        });
      } else {
        // Create new level
        const nextSortOrder = Math.max(...levels.map(l => l.sort_order), 0) + 1;
        
        const { error } = await supabase
          .from('levels')
          .insert([{ ...formData, sort_order: nextSortOrder }]);

        if (error) throw error;

        toast({
          title: "Nivel creado",
          description: "El nuevo nivel se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingLevel(null);
      setFormData({ name: "", description: "", icon: "", color: "", bg_color: "" });
      fetchLevels();
    } catch (error) {
      console.error('Error saving level:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el nivel",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || "",
      icon: level.icon || "",
      color: level.color || "",
      bg_color: level.bg_color || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (level: Level) => {
    try {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', level.id);

      if (error) throw error;

      toast({
        title: "Nivel eliminado",
        description: "El nivel se ha eliminado correctamente",
      });
      
      fetchLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el nivel",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", icon: "", color: "", bg_color: "" });
    setEditingLevel(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center">Cargando...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Niveles</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Nivel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? "Editar Nivel" : "Crear Nuevo Nivel"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Icono (emoji)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🌱"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color (HSL)</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="hsl(142 76% 36%)"
                  />
                </div>
                <div>
                  <Label htmlFor="bg_color">Color de fondo (HSL)</Label>
                  <Input
                    id="bg_color"
                    value={formData.bg_color}
                    onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                    placeholder="hsl(142 76% 36% / 0.1)"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingLevel ? "Actualizar" : "Crear"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {levels.map((level) => (
            <Card key={level.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{level.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{level.name}</h3>
                    <p className="text-muted-foreground text-sm">{level.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {level.question_count} preguntas
                      </Badge>
                      <Badge variant={level.is_active ? "default" : "secondary"}>
                        {level.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(level)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar nivel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminarán también todas las preguntas asociadas a este nivel.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(level)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
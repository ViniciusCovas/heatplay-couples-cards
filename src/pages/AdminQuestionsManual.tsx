import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Search, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface Level {
  id: string;
  name: string;
  language: string;
}

interface Question {
  id: string;
  text: string;
  category: string;
  level_id: string;
  level_name: string;
  language: string;
  is_active: boolean;
  created_at: string;
}

interface QuestionFormData {
  text: string;
  category: string;
  level_id: string;
  language: string;
}

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function AdminQuestionsManual() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("es");
  const [formData, setFormData] = useState<QuestionFormData>({
    text: "",
    category: "",
    level_id: "",
    language: "es",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, filterLevel, selectedLanguage]);

  useEffect(() => {
    fetchData();
  }, [selectedLanguage]);

  const fetchData = async () => {
    try {
      // Fetch levels for selected language
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('id, name, language')
        .eq('language', selectedLanguage)
        .eq('is_active', true)
        .order('sort_order');

      if (levelsError) throw levelsError;

      // Fetch questions with level names for selected language
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          category,
          level_id,
          language,
          is_active,
          created_at,
          levels!inner(name, language)
        `)
        .eq('language', selectedLanguage)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;

      const questionsWithLevelNames = questionsData.map(q => ({
        ...q,
        level_name: q.levels.name
      }));

      setLevels(levelsData || []);
      setQuestions(questionsWithLevelNames || []);
    } catch (error) {
      logger.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by level
    if (filterLevel !== "all") {
      filtered = filtered.filter(q => q.level_id === filterLevel);
    }

    setFilteredQuestions(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.text.trim() || !formData.level_id || !formData.language) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            text: formData.text.trim(),
            category: formData.category.trim() || 'general',
            level_id: formData.level_id,
            language: formData.language
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;

        toast({
          title: "Pregunta actualizada",
          description: "La pregunta se ha actualizado correctamente",
        });
      } else {
        // Create new question
        const { error } = await supabase
          .from('questions')
          .insert([{
            text: formData.text.trim(),
            category: formData.category.trim() || 'general',
            level_id: formData.level_id,
            language: formData.language
          }]);

        if (error) throw error;

        toast({
          title: "Pregunta creada",
          description: "La nueva pregunta se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingQuestion(null);
      setFormData({ text: "", category: "", level_id: "", language: selectedLanguage });
      fetchData();
    } catch (error) {
      logger.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la pregunta",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      category: question.category,
      level_id: question.level_id,
      language: question.language,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (question: Question) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      toast({
        title: "Pregunta eliminada",
        description: "La pregunta se ha eliminado correctamente",
      });
      
      fetchData();
    } catch (error) {
      logger.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la pregunta",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ text: "", category: "", level_id: "", language: selectedLanguage });
    setEditingQuestion(null);
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
          <div>
            <h2 className="text-2xl font-bold">Gestión Manual de Preguntas</h2>
            <div className="flex items-center gap-2 mt-2">
              <Globe className="w-4 h-4" />
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Pregunta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? "Editar Pregunta" : "Crear Nueva Pregunta"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="language">Idioma *</Label>
                  <Select 
                    value={formData.language} 
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="level_id">Nivel *</Label>
                  <Select 
                    value={formData.level_id} 
                    onValueChange={(value) => setFormData({ ...formData, level_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="text">Texto de la pregunta *</Label>
                  <Textarea
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="general"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingQuestion ? "Actualizar" : "Crear"}
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Buscar preguntas</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por texto o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter-level">Filtrar por nivel</Label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Mostrando {filteredQuestions.length} de {questions.length} preguntas
            </p>
          </div>
          
          {filteredQuestions.length > 0 ? (
            <div className="space-y-3">
              {filteredQuestions.map((question) => (
                <Card key={question.id} className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium mb-2">{question.text}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {question.level_name}
                        </Badge>
                        <Badge variant="secondary">
                          {question.category}
                        </Badge>
                        <Badge variant="outline">
                          {languages.find(lang => lang.code === question.language)?.flag} {question.language.toUpperCase()}
                        </Badge>
                        <Badge variant={question.is_active ? "default" : "secondary"}>
                          {question.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(question)}
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
                            <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. La pregunta será eliminada permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(question)}>
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
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No se encontraron preguntas</p>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
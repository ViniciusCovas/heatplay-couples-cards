import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Search, Globe, Target, Zap, MessageCircle, FileText, List, Grid, CheckSquare, Square } from "lucide-react";
import { QuestionFormFields } from "@/components/admin/QuestionFormFields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  intensity: number;
  question_type: string;
}

interface QuestionFormData {
  text: string;
  category: string;
  level_id: string;
  language: string;
  intensity: number;
  question_type: string;
}

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const intensityConfig = {
  1: { label: 'Muy Suave', color: 'bg-green-100 text-green-800', icon: '🌱' },
  2: { label: 'Suave', color: 'bg-blue-100 text-blue-800', icon: '💧' },
  3: { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800', icon: '⚡' },
  4: { label: 'Intensa', color: 'bg-orange-100 text-orange-800', icon: '🔥' },
  5: { label: 'Muy Intensa', color: 'bg-red-100 text-red-800', icon: '💥' }
};

const typeConfig = {
  open_ended: { label: 'Abierta', icon: MessageCircle, color: 'bg-blue-100 text-blue-800' },
  choice_based: { label: 'Elección', icon: Target, color: 'bg-green-100 text-green-800' },
  scenario: { label: 'Escenario', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  reflection: { label: 'Reflexión', icon: Zap, color: 'bg-orange-100 text-orange-800' }
};

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState<QuestionFormData>({
    text: "",
    category: "",
    level_id: "",
    language: "es",
    intensity: 3,
    question_type: "open_ended",
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
          intensity,
          question_type,
          levels!inner(name, language)
        `)
        .eq('language', selectedLanguage)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;

      const questionsWithLevelNames = questionsData.map(q => ({
        ...q,
        level_name: q.levels.name,
        intensity: q.intensity || 3,
        question_type: q.question_type || 'open_ended'
      }));

      setLevels(levelsData || []);
      setQuestions(questionsWithLevelNames || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
            language: formData.language,
            intensity: formData.intensity,
            question_type: formData.question_type
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
            language: formData.language,
            intensity: formData.intensity,
            question_type: formData.question_type
          }]);

        if (error) throw error;

        toast({
          title: "Pregunta creada",
          description: "La nueva pregunta se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingQuestion(null);
      setFormData({ text: "", category: "", level_id: "", language: selectedLanguage, intensity: 3, question_type: "open_ended" });
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
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
      intensity: question.intensity || 3,
      question_type: question.question_type || 'open_ended',
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
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la pregunta",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ text: "", category: "", level_id: "", language: selectedLanguage, intensity: 3, question_type: "open_ended" });
    setEditingQuestion(null);
  };

  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuestions);
    if (checked) {
      newSelected.add(questionId);
    } else {
      newSelected.delete(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    } else {
      setSelectedQuestions(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.size === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;

      toast({
        title: "Preguntas eliminadas",
        description: `Se eliminaron ${selectedQuestions.size} preguntas correctamente`,
      });
      
      setSelectedQuestions(new Set());
      fetchData();
    } catch (error) {
      console.error('Error deleting questions:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar todas las preguntas",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const isAllSelected = filteredQuestions.length > 0 && selectedQuestions.size === filteredQuestions.length;
  const isPartiallySelected = selectedQuestions.size > 0 && selectedQuestions.size < filteredQuestions.length;

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
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? "Editar Pregunta" : "Crear Nueva Pregunta"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <QuestionFormFields
                  formData={formData}
                  setFormData={setFormData}
                  levels={levels}
                  languages={languages}
                />
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

        {/* View Controls and Bulk Actions */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                Mostrando {filteredQuestions.length} de {questions.length} preguntas
              </p>
              {selectedQuestions.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedQuestions.size} seleccionadas
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Seleccionadas ({selectedQuestions.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {selectedQuestions.size} preguntas?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Las preguntas seleccionadas serán eliminadas permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>
                          Eliminar {selectedQuestions.size} preguntas
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Grid className="w-4 h-4 mr-2" />
                Tarjetas
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4 mr-2" />
                Tabla
              </Button>
            </div>
          </div>
          
          {filteredQuestions.length > 0 ? (
            viewMode === 'cards' ? (
              <div className="space-y-3">
                {filteredQuestions.map((question) => {
                  const intensityInfo = intensityConfig[question.intensity as keyof typeof intensityConfig];
                  const typeInfo = typeConfig[question.question_type as keyof typeof typeConfig];
                  const TypeIcon = typeInfo.icon;
                  const isSelected = selectedQuestions.has(question.id);

                  return (
                    <Card key={question.id} className={`p-4 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.text}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {question.level_name}
                              </Badge>
                              <Badge variant="secondary">
                                {question.category}
                              </Badge>
                              <Badge className={intensityInfo.color}>
                                {intensityInfo.icon} {intensityInfo.label}
                              </Badge>
                              <Badge className={typeInfo.color}>
                                <TypeIcon className="w-3 h-3 mr-1" />
                                {typeInfo.label}
                              </Badge>
                              <Badge variant="outline">
                                {languages.find(lang => lang.code === question.language)?.flag} {question.language.toUpperCase()}
                              </Badge>
                              <Badge variant={question.is_active ? "default" : "secondary"}>
                                {question.is_active ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>
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
                  );
                })}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) {
                              const checkbox = el.querySelector('button[role="checkbox"]') as HTMLInputElement;
                              if (checkbox) checkbox.indeterminate = isPartiallySelected;
                            }
                          }}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Pregunta</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Intensidad</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question) => {
                      const intensityInfo = intensityConfig[question.intensity as keyof typeof intensityConfig];
                      const typeInfo = typeConfig[question.question_type as keyof typeof typeConfig];
                      const TypeIcon = typeInfo.icon;
                      const isSelected = selectedQuestions.has(question.id);

                      return (
                        <TableRow key={question.id} className={isSelected ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="truncate">{question.text}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{question.level_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{question.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={intensityInfo.color}>
                              {intensityInfo.icon} {intensityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={typeInfo.color}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={question.is_active ? "default" : "secondary"}>
                              {question.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )
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

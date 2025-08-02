import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface Level {
  id: string;
  name: string;
  language: string;
}

interface Question {
  text: string;
  category: string;
}

export default function AdminQuestionsBulk() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedLevelLanguage, setSelectedLevelLanguage] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('id, name, language')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      logger.error('Error fetching levels:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los niveles",
        variant: "destructive",
      });
    }
  };

  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId);
    const selectedLevel = levels.find(level => level.id === levelId);
    setSelectedLevelLanguage(selectedLevel?.language || 'en');
  };

  const parseCSV = (text: string): Question[] => {
    const lines = text.trim().split('\n');
    const questions: Question[] = [];

    // Skip header if it exists
    const startIndex = lines[0].toLowerCase().includes('text') || lines[0].toLowerCase().includes('pregunta') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quotes)
      const regex = /(?:^|,)("(?:[^"]+|"")*"|[^,]*)/g;
      const matches = [];
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        let value = match[1];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace('""', '"');
        }
        matches.push(value);
      }

      if (matches.length >= 1) {
        questions.push({
          text: matches[0] || '',
          category: matches[1] || 'general'
        });
      }
    }

    return questions;
  };

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    if (value.trim()) {
      const questions = parseCSV(value);
      setPreviewQuestions(questions);
    } else {
      setPreviewQuestions([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    const text = await file.text();
    setTextInput(text);
    handleTextInputChange(text);
  };

  const handleUpload = async () => {
    if (!selectedLevelId) {
      toast({
        title: "Error",
        description: "Selecciona un nivel",
        variant: "destructive",
      });
      return;
    }

    if (previewQuestions.length === 0) {
      toast({
        title: "Error",
        description: "No hay preguntas para subir",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const questionsToInsert = previewQuestions.map(q => ({
        level_id: selectedLevelId,
        text: q.text.trim(),
        category: q.category.trim() || 'general',
        language: selectedLevelLanguage || 'en'
      }));

      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast({
        title: "Preguntas subidas",
        description: `Se han subido ${previewQuestions.length} preguntas correctamente`,
      });

      // Reset form
      setTextInput("");
      setCsvFile(null);
      setPreviewQuestions([]);
      setSelectedLevelId("");
      setSelectedLevelLanguage("");
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      logger.error('Error uploading questions:', error);
      toast({
        title: "Error",
        description: "No se pudieron subir las preguntas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Subir Preguntas en Lote</h2>
          <p className="text-muted-foreground">
            Sube múltiples preguntas usando CSV o texto con formato. 
            Formato esperado: "texto,categoría" (una pregunta por línea)
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Datos de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="level-select">Nivel de destino</Label>
                <Select value={selectedLevelId} onValueChange={handleLevelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name} ({level.language.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLevelLanguage && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Las preguntas se subirán en idioma: <strong>{selectedLevelLanguage.toUpperCase()}</strong>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="csv-file">Archivo CSV</Label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              <div className="text-center text-muted-foreground">o</div>

              <div>
                <Label htmlFor="text-input">Texto directo</Label>
                <Textarea
                  id="text-input"
                  placeholder="¿Cuál fue tu primera impresión de mí?,reflexion
¿Qué canción te recuerda a nosotros?,dinamica"
                  value={textInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  rows={8}
                />
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={loading || !selectedLevelId || previewQuestions.length === 0}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? "Subiendo..." : `Subir ${previewQuestions.length} Preguntas`}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Vista Previa ({previewQuestions.length} preguntas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewQuestions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {previewQuestions.map((question, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="text-sm font-medium">{question.text}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {question.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Las preguntas aparecerán aquí mientras escribes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Format Help */}
        <Card>
          <CardHeader>
            <CardTitle>Formato de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Formato CSV esperado:</strong></p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`"¿Cuál fue tu primera impresión de mí?","reflexion"
"¿Qué canción te recuerda a nosotros?","dinamica"
"¿Cuál es tu recuerdo favorito juntos?","dinamica"`}
              </pre>
              <p className="text-muted-foreground">
                • Primera columna: texto de la pregunta (obligatorio)
                <br />
                • Segunda columna: categoría (opcional, por defecto "general")
                <br />
                • Usa comillas para textos que contengan comas
                <br />
                • El idioma se asigna automáticamente según el nivel seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

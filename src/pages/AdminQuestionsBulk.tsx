
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
import { useTranslation } from "react-i18next";

interface Level {
  id: string;
  name: string;
}

interface Question {
  text: string;
  category: string;
}

const languageOptions = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function AdminQuestionsBulk() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [textInput, setTextInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchLevels();
  }, [selectedLanguage]);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('id, name')
        .eq('is_active', true)
        .eq('language', selectedLanguage)
        .order('sort_order');

      if (error) throw error;
      setLevels(data || []);
      
      // Reset selected level if it's not available in the new language
      if (selectedLevelId && !data?.find(level => level.id === selectedLevelId)) {
        setSelectedLevelId("");
      }
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: "Error",
        description: "Could not load levels",
        variant: "destructive",
      });
    }
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
        description: t('admin.bulkUpload.selectLevel'),
        variant: "destructive",
      });
      return;
    }

    if (!selectedLanguage) {
      toast({
        title: "Error",
        description: t('admin.bulkUpload.selectLanguage'),
        variant: "destructive",
      });
      return;
    }

    if (previewQuestions.length === 0) {
      toast({
        title: "Error",
        description: "No questions to upload",
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
        language: selectedLanguage
      }));

      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast({
        title: "Questions uploaded",
        description: `Successfully uploaded ${previewQuestions.length} questions`,
      });

      // Reset form
      setTextInput("");
      setCsvFile(null);
      setPreviewQuestions([]);
      setSelectedLevelId("");
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error uploading questions:', error);
      toast({
        title: "Error",
        description: "Could not upload questions",
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
          <h2 className="text-2xl font-bold mb-2">{t('admin.bulkUpload.title')}</h2>
          <p className="text-muted-foreground">
            {t('admin.bulkUpload.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.bulkUpload.inputSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language-select">{t('admin.bulkUpload.language')}</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.bulkUpload.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="level-select">{t('admin.bulkUpload.targetLevel')}</Label>
                <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.bulkUpload.selectLevel')} />
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
                <Label htmlFor="csv-file">{t('admin.bulkUpload.csvFile')}</Label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              <div className="text-center text-muted-foreground">{t('admin.bulkUpload.or')}</div>

              <div>
                <Label htmlFor="text-input">{t('admin.bulkUpload.directText')}</Label>
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
                disabled={loading || !selectedLevelId || !selectedLanguage || previewQuestions.length === 0}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? t('admin.bulkUpload.uploading') : t('admin.bulkUpload.uploadQuestions', { count: previewQuestions.length })}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('admin.bulkUpload.preview', { count: previewQuestions.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewQuestions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {previewQuestions.map((question, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="text-sm font-medium">{question.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {question.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {languageOptions.find(lang => lang.code === selectedLanguage)?.flag} {languageOptions.find(lang => lang.code === selectedLanguage)?.name}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Questions will appear here as you type</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Format Help */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.bulkUpload.formatHelp')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>CSV format expected:</strong></p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`"¿Cuál fue tu primera impresión de mí?","reflexion"
"¿Qué canción te recuerda a nosotros?","dinamica"
"¿Cuál es tu recuerdo favorito juntos?","dinamica"`}
              </pre>
              <div className="text-muted-foreground whitespace-pre-line">
                {t('admin.bulkUpload.formatDescription')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

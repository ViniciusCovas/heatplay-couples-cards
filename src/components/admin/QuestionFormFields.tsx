
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuestionFormData {
  text: string;
  category: string;
  level_id: string;
  language: string;
  intensity: number;
  question_type: string;
}

interface QuestionFormFieldsProps {
  formData: QuestionFormData;
  setFormData: (data: QuestionFormData) => void;
  levels: Array<{ id: string; name: string; language: string }>;
  languages: Array<{ code: string; name: string; flag: string }>;
}

const questionTypes = [
  { value: 'open_ended', label: 'Abierta', description: 'Pregunta que permite respuesta libre' },
  { value: 'choice_based', label: 'Elección', description: 'Pregunta con opciones específicas' },
  { value: 'scenario', label: 'Escenario', description: 'Situación hipotética para discutir' },
  { value: 'reflection', label: 'Reflexión', description: 'Pregunta introspectiva profunda' }
];

const categories = [
  'general', 'reflexion', 'dinamica', 'profunda', 'intima', 'personal', 
  'relacion', 'futuro', 'pasado', 'emocional', 'fisica', 'mental'
];

const intensityLabels = {
  1: { label: 'Muy Suave', color: 'bg-green-100 text-green-800' },
  2: { label: 'Suave', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800' },
  4: { label: 'Intensa', color: 'bg-orange-100 text-orange-800' },
  5: { label: 'Muy Intensa', color: 'bg-red-100 text-red-800' }
};

export function QuestionFormFields({ 
  formData, 
  setFormData, 
  levels, 
  languages 
}: QuestionFormFieldsProps) {
  return (
    <TooltipProvider>
      <div className="space-y-4">
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
            placeholder="Escribe aquí la pregunta..."
          />
        </div>

        <div>
          <Label htmlFor="category">Categoría</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="question_type">Tipo de Pregunta</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Define cómo debe ser procesada la pregunta por la IA</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select 
            value={formData.question_type} 
            onValueChange={(value) => setFormData({ ...formData, question_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="intensity">Intensidad Emocional</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nivel de impacto emocional esperado (1-5)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            <Slider
              value={[formData.intensity]}
              onValueChange={(value) => setFormData({ ...formData, intensity: value[0] })}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 - Muy Suave</span>
              <span>3 - Moderada</span>
              <span>5 - Muy Intensa</span>
            </div>
            <Badge className={intensityLabels[formData.intensity as keyof typeof intensityLabels].color}>
              {intensityLabels[formData.intensity as keyof typeof intensityLabels].label}
            </Badge>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

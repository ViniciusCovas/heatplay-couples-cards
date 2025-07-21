
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Target, Zap, MessageCircle } from "lucide-react";

interface Question {
  text: string;
  category: string;
  intensity?: number;
  question_type?: string;
}

interface QuestionPreviewProps {
  questions: Question[];
}

const intensityConfig = {
  1: { label: 'Muy Suave', color: 'bg-green-100 text-green-800', icon: '🌱' },
  2: { label: 'Suave', color: 'bg-blue-100 text-blue-800', icon: '💧' },
  3: { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800', icon: '⚡' },
  4: { label: 'Intensa', color: 'bg-orange-100 text-orange-800', icon: '🔥' },
  5: { label: 'Muy Intensa', color: 'bg-red-100 text-red-800', icon: '💥' }
};

const typeConfig = {
  open_ended: { label: 'Abierta', icon: MessageCircle },
  choice_based: { label: 'Elección', icon: Target },
  scenario: { label: 'Escenario', icon: FileText },
  reflection: { label: 'Reflexión', icon: Zap }
};

export function QuestionPreview({ questions }: QuestionPreviewProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Las preguntas aparecerán aquí mientras escribes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {questions.map((question, index) => {
        const intensity = question.intensity || 3;
        const questionType = question.question_type || 'open_ended';
        const intensityInfo = intensityConfig[intensity as keyof typeof intensityConfig];
        const typeInfo = typeConfig[questionType as keyof typeof typeConfig];
        const TypeIcon = typeInfo.icon;

        return (
          <Card key={index} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">{question.text}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {question.category || 'general'}
                </Badge>
                <Badge className={`text-xs ${intensityInfo.color}`}>
                  {intensityInfo.icon} {intensityInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <TypeIcon className="w-3 h-3" />
                  {typeInfo.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

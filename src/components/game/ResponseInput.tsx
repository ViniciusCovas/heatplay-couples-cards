import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Timer, Send } from "lucide-react";

interface ResponseInputProps {
  isVisible: boolean;
  question: string;
  onSubmitResponse: (response: string, responseTime: number) => void;
  playerName?: string;
}

export const ResponseInput = ({ 
  isVisible, 
  question, 
  onSubmitResponse,
  playerName = "Tú"
}: ResponseInputProps) => {
  const [response, setResponse] = useState("");
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    if (isVisible) {
      const start = Date.now();
      setStartTime(start);
      setCurrentTime(start);
      setResponse("");
      
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const elapsedTime = (currentTime - startTime) / 1000;

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmitResponse(response.trim(), elapsedTime);
      setResponse("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-heading">Tu turno de responder</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Timer className="w-4 h-4" />
            <span>{Math.round(elapsedTime)}s</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pregunta:</p>
            <p className="font-medium">{question}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tu respuesta:</label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Escribe tu respuesta aquí..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Presiona Ctrl + Enter para enviar
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={!response.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Respuesta
        </Button>
      </Card>
    </div>
  );
};
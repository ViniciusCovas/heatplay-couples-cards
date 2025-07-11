import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CreateRoom = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomCode, setRoomCode] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  // Generate room code
  useEffect(() => {
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    setRoomCode(generateCode());
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast({
        title: "¡Código copiado!",
        description: "Comparte este código con tu pareja",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar el código",
        variant: "destructive",
      });
    }
  };

  const startGame = () => {
    setIsWaiting(true);
    // TODO: Initialize session and wait for partner
    setTimeout(() => {
      navigate('/level-select');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-heading text-foreground">Crear sala</h1>
        </div>

        {/* Room Code Display */}
        <Card className="p-8 text-center space-y-6 shadow-lg border-2 border-primary/20">
          <div className="space-y-3">
            <p className="text-lg font-heading text-foreground">
              Tu código de sala:
            </p>
            
            <div className="relative">
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
                <span className="text-3xl font-bold font-mono text-primary tracking-widest">
                  {roomCode}
                </span>
              </div>
              
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="absolute -top-2 -right-2 bg-card border-primary/30"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Comparte este código con tu pareja para que se una a la sala
            </p>
            
            {!isWaiting ? (
              <Button 
                onClick={startGame}
                className="w-full h-12 text-lg font-heading bg-primary hover:bg-primary/90"
                size="lg"
              >
                Empezar
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Esperando a tu pareja...
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2">
            <h3 className="font-heading text-sm text-foreground">Instrucciones:</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Comparte el código con tu pareja</li>
              <li>• Ambos deben estar listos antes de empezar</li>
              <li>• Pueden estar juntos o en videollamada</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateRoom;
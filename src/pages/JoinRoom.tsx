import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const JoinRoom = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de sala",
        variant: "destructive",
      });
      return;
    }

    if (roomCode.length !== 6) {
      toast({
        title: "Error",
        description: "El código debe tener 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // TODO: Validate room code with backend
    setTimeout(() => {
      // Simulate validation
      if (roomCode.toUpperCase() === "TEST123") {
        navigate(`/level-select?room=${roomCode}`);
      } else {
        toast({
          title: "Código no válido",
          description: "Verifica el código e intenta nuevamente",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      joinRoom();
    }
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
          <h1 className="text-2xl font-heading text-foreground">Unirme a sala</h1>
        </div>

        {/* Join Form */}
        <Card className="p-8 space-y-6 shadow-lg border-2 border-primary/20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-heading text-foreground">
                Ingresar código de sala
              </h2>
              <p className="text-sm text-muted-foreground">
                Pide a tu pareja el código de 6 caracteres
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="CÓDIGO"
                value={roomCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="text-center text-2xl font-mono tracking-widest h-14 border-2 border-primary/30 focus:border-primary"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {roomCode.length}/6 caracteres
              </p>
            </div>

            <Button 
              onClick={joinRoom}
              disabled={isLoading || roomCode.length !== 6}
              className="w-full h-12 text-lg font-heading bg-primary hover:bg-primary/90 disabled:opacity-50"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </div>
        </Card>

        {/* Helper */}
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2">
            <h3 className="font-heading text-sm text-foreground">¿Necesitas ayuda?</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• El código debe tener exactamente 6 caracteres</li>
              <li>• Solo contiene letras y números</li>
              <li>• Es sensible a mayúsculas y minúsculas</li>
            </ul>
          </div>
        </Card>

        {/* Test Code Helper */}
        <Card className="p-3 bg-secondary/10 border border-secondary/30">
          <p className="text-xs text-center text-secondary">
            Código de prueba: <span className="font-mono font-bold">TEST123</span>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default JoinRoom;
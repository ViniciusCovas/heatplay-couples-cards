import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Users, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-secondary mr-2" />
            <h1 className="text-3xl font-heading text-foreground">Cartas Íntimas</h1>
          </div>
          <p className="text-lg text-muted-foreground font-body">
            ¿Listos para profundizar su conexión?
          </p>
        </div>

        {/* Main Actions */}
        <Card className="p-6 space-y-4 shadow-lg border-2 border-primary/20">
          <Button 
            onClick={() => navigate('/create-room')}
            className="w-full h-12 text-lg font-heading bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Users className="w-5 h-5 mr-2" />
            Crear sala
          </Button>
          
          <Button 
            onClick={() => navigate('/join-room')}
            variant="outline"
            className="w-full h-12 text-lg font-heading border-2 border-primary text-primary hover:bg-primary/10"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Unirme a sala
          </Button>
        </Card>

        {/* Footer Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Juego de conversación por niveles
          </p>
          <p className="text-xs text-destructive font-medium">
            Para mayores de 18 años
          </p>
        </div>

        {/* Features */}
        <Card className="p-4 bg-muted/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <p className="text-xs text-muted-foreground">Descubrimiento</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-bold text-secondary">2</span>
              </div>
              <p className="text-xs text-muted-foreground">Confianza</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-bold text-destructive">3</span>
              </div>
              <p className="text-xs text-muted-foreground">Sin filtros</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Home;
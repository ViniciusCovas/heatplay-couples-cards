import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Mic, Gamepad2 } from "lucide-react";

interface ProximitySelectorProps {
  isVisible: boolean;
  onSelect: (isClose: boolean) => void;
}

export const ProximitySelector = ({ isVisible, onSelect }: ProximitySelectorProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-8 animate-scale-in bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/20 shadow-2xl shadow-primary/10">
        {/* Gaming Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse border-2 border-background"></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ¿Cómo van a jugar?
            </h1>
            <p className="text-muted-foreground mt-2">
              Selecciona tu modalidad de juego
            </p>
          </div>
        </div>

        {/* Gaming Options */}
        <div className="space-y-4">
          {/* Close Option */}
          <div 
            onClick={() => onSelect(true)}
            className="group relative p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border-2 border-green-500/20 hover:border-green-500/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading text-foreground group-hover:text-green-600 transition-colors">
                  Están juntos 💕
                </h3>
                <p className="text-sm text-muted-foreground">
                  Respuestas habladas • Más íntimo • Cara a cara
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-green-500/30 group-hover:border-green-500 group-hover:bg-green-500/20 transition-all"></div>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Far Option */}
          <div 
            onClick={() => onSelect(false)}
            className="group relative p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading text-foreground group-hover:text-purple-600 transition-colors">
                  Están separados 📱
                </h3>
                <p className="text-sm text-muted-foreground">
                  Respuestas escritas • A distancia • Por chat
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 group-hover:border-purple-500 group-hover:bg-purple-500/20 transition-all"></div>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Gaming Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Preparándose para conectar...</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
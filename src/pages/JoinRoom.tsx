import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomService } from '@/hooks/useRoomService';
import { WaitingRoom } from '@/components/game/WaitingRoom';
import { useTranslation } from 'react-i18next';

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { room, participants, joinRoom, leaveRoom, startGame } = useRoomService();
  const { t } = useTranslation();

  const handleJoinRoom = async (): Promise<void> => {
    if (!roomCode.trim()) {
      toast.error('Por favor ingresa un código de sala');
      return;
    }

    if (roomCode.length !== 6) {
      toast.error('El código debe tener 6 caracteres');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await joinRoom(roomCode.toUpperCase());
      
      if (success) {
        toast.success('¡Conectado a la sala!');
      } else {
        toast.error('Código no válido. Verifica el código e intenta nuevamente.');
      }
    } catch (error) {
      toast.error('Error al conectar. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameStart = async (): Promise<void> => {
    await startGame(); // Espera a que startGame() termine
    navigate(`/proximity-selection?room=${roomCode}`);
  };

  const handleLeaveRoom = (): void => {
    leaveRoom();
    navigate('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  // Show waiting room if connected to a room
  if (room) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        participants={participants}
        onGameStart={handleGameStart}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Unirse a Sala
            </CardTitle>
          </div>
          
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border-2 border-primary/20">
            <Users className="w-8 h-8 text-primary" />
          </div>
          
          <p className="text-muted-foreground">
            Ingresa el código que te compartió tu pareja
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="CÓDIGO"
                value={roomCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="text-center text-2xl font-mono tracking-widest h-14 border-2 border-primary/30 focus:border-primary bg-muted/30"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {roomCode.length}/6 caracteres
              </p>
            </div>

            <Button 
              onClick={handleJoinRoom}
              className="w-full h-12 text-lg font-semibold"
              disabled={isLoading || roomCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Unirse a la sala'
              )}
            </Button>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
            <h3 className="font-semibold mb-2 text-center">Instrucciones</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Pide a tu pareja el código de 6 caracteres</li>
              <li>• El código contiene solo letras y números</li>
              <li>• Una vez conectados, el juego iniciará automáticamente</li>
            </ul>
          </div>

          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm text-center">
              <span className="font-semibold">💡 Código de prueba:</span> TEST123
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Úsalo para probar el juego sin pareja
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
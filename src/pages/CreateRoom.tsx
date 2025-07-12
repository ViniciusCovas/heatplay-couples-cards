import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomService } from '@/hooks/useRoomService';
import { WaitingRoom } from '@/components/game/WaitingRoom';

export default function CreateRoom() {
  const [level] = useState(1); // Default level
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();
  const { room, participants, createRoom, leaveRoom, startGame } = useRoomService();

  const handleCreateRoom = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const code = await createRoom(level);
      setRoomCode(code);
      toast.success('Sala creada exitosamente');
    } catch (error) {
      toast.error('Error al crear la sala');
      console.error('Error creating room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGameStart = async (): Promise<void> => {
    await startGame(); // Espera a que startGame() termine
    navigate(`/game?room=${roomCode}&level=${level}`);
  };

  const handleLeaveRoom = (): void => {
    leaveRoom();
    navigate('/');
  };

  // Show waiting room if room is created
  if (room && roomCode) {
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
        <CardHeader className="text-center space-y-2 pb-4">
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
              Crear Sala
            </CardTitle>
          </div>
          <p className="text-muted-foreground text-center">
            Crea una sala para jugar con tu pareja
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={handleCreateRoom}
              className="w-full h-12 text-lg font-semibold"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creando sala...
                </>
              ) : (
                'Crear Sala'
              )}
            </Button>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
            <h3 className="font-semibold mb-2">¿Cómo funciona?</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Crea una sala y obtén tu código único</li>
              <li>Comparte el código con tu pareja</li>
              <li>Espera a que se conecte</li>
              <li>¡El juego comenzará automáticamente!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
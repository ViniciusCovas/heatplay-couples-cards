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
      toast.error(t('joinRoom.errors.enterCode'));
      return;
    }

    if (roomCode.length !== 6) {
      toast.error(t('joinRoom.errors.invalidLength'));
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await joinRoom(roomCode.toUpperCase());
      
      if (success) {
        toast.success(t('joinRoom.success.connected'));
      } else {
        toast.error(t('joinRoom.errors.invalidCode'));
      }
    } catch (error) {
      toast.error(t('joinRoom.errors.connectionError'));
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
    <div className="min-h-screen romantic-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md romantic-card border-2 border-primary/20 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="absolute left-4 top-4 hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('joinRoom.title')}
            </CardTitle>
          </div>
          
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-primary/30 pulse-romantic">
            <Users className="w-8 h-8 text-primary" />
          </div>
          
          <p className="text-muted-foreground">
            {t('joinRoom.subtitle')}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={t('joinRoom.codePlaceholder')}
                value={roomCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="text-center text-2xl font-mono tracking-widest h-14 border-2 border-primary/30 focus:border-primary bg-muted/30 rounded-xl"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('joinRoom.charactersCount', { count: roomCode.length })}
              </p>
            </div>

            <Button 
              onClick={handleJoinRoom}
              className="w-full h-12 text-lg font-semibold btn-gradient-primary"
              disabled={isLoading || roomCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('joinRoom.connecting')}
                </>
              ) : (
                t('joinRoom.joinButton')
              )}
            </Button>
          </div>

          <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
            <h3 className="font-semibold mb-2 text-center">{t('joinRoom.instructions.title')}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('joinRoom.instructions.step1')}</li>
              <li>• {t('joinRoom.instructions.step2')}</li>
              <li>• {t('joinRoom.instructions.step3')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomService } from '@/hooks/useRoomService';
import { WaitingRoom } from '@/components/game/WaitingRoom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/animated-logo';

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasProcessedUrl, setHasProcessedUrl] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { room, participants, joinRoom, leaveRoom, startGame } = useRoomService();
  const { t } = useTranslation();

  // Handle URL room parameter for direct joins with race condition prevention
  useEffect(() => {
    const urlRoomCode = searchParams.get('room');
    
    if (urlRoomCode && !room && !hasProcessedUrl && !isJoining) {
      setHasProcessedUrl(true);
      setRoomCode(urlRoomCode.toUpperCase());
      // Auto-join if room code is in URL
      handleJoinRoom(urlRoomCode);
    }
    
    // Reset when URL room parameter is removed
    if (!urlRoomCode && hasProcessedUrl) {
      setHasProcessedUrl(false);
    }
  }, [searchParams.get('room'), room, hasProcessedUrl, isJoining]);

  const handleJoinRoom = async (codeToJoin?: string): Promise<void> => {
    const code = codeToJoin || roomCode;

    // Prevent duplicate calls
    if (isJoining) {
      console.log('🔒 Room join already in progress, skipping duplicate call');
      return;
    }

    if (!code.trim()) {
      toast.error(t('joinRoom.errors.enterCode'));
      return;
    }

    if (code.length !== 6) {
      toast.error(t('joinRoom.errors.invalidLength'));
      return;
    }

    setIsLoading(true);
    setIsJoining(true);
    
    try {
      console.log('🚀 Attempting to join room:', code);
      const success = await joinRoom(code.toUpperCase());
      
      if (success) {
        console.log('✅ Successfully joined room');
        toast.success(t('joinRoom.success.connected'));
        if (!codeToJoin) setRoomCode(code); // Only update state if manual input
      } else {
        console.log('❌ Room join unsuccessful');
        toast.error(t('joinRoom.errors.invalidCode'));
        setHasProcessedUrl(false); // Reset to allow retry
      }
    } catch (error: any) {
      console.log('❌ Room join error:', error.message);
      if (error.message === 'room_full') {
        toast.error('Room is full. Try another code or create a new room.');
      } else if (error.message === 'room_not_found') {
        toast.error(t('joinRoom.errors.invalidCode'));
      } else if (error.message === 'player_not_ready') {
        toast.error('Authentication not ready. Please refresh and try again.');
      } else {
        toast.error(t('joinRoom.errors.connectionError'));
      }
      setHasProcessedUrl(false); // Reset to allow retry
    } finally {
      setIsLoading(false);
      setIsJoining(false);
    }
  };

  const handleGameStart = async (): Promise<void> => {
    await startGame(); // Espera a que startGame() termine
    navigate('/proximity-selection', { 
      state: { 
        roomCode: room?.room_code, 
        isCreator: false,
        alreadyJoined: true // Flag to indicate player already joined successfully
      } 
    });
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
    <div className="min-h-screen romantic-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo 
            size="medium"
            className="hover:scale-105 transition-transform duration-300"
          />
          <div className="w-10" />
        </div>
      </div>
      
      <Card className="w-full max-w-md romantic-card border-2 border-primary/20 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex items-center justify-center gap-3">
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
              onClick={() => handleJoinRoom()}
              className="w-full h-12 text-lg font-semibold btn-gradient-primary"
              disabled={isLoading || isJoining || roomCode.length !== 6}
            >
              {isLoading || isJoining ? (
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
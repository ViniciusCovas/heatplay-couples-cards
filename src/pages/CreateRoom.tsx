import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomService } from '@/hooks/useRoomService';
import { WaitingRoom } from '@/components/game/WaitingRoom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/animated-logo';
import { LanguageSelector } from '@/components/ui/language-selector';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { CreditPurchaseModal } from '@/components/credits/CreditPurchaseModal';
import { useCredits } from '@/hooks/useCredits';

function CreateRoomContent() {
  const [level] = useState(1); // Default level
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, participants, createRoom, leaveRoom, startGame } = useRoomService();
  const { credits } = useCredits();
  const { t } = useTranslation();

  const handleCreateRoom = async (): Promise<void> => {
    // Check if user has credits first
    if (credits < 1) {
      setShowCreditModal(true);
      return;
    }

    setIsCreating(true);
    try {
      const code = await createRoom(level, user?.id);
      setRoomCode(code);
      toast.success(t('messages.roomCreated'));
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setIsCreating(false);
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
          <div className="flex items-center gap-3">
            <CreditBalance />
            <LanguageSelector />
          </div>
        </div>
      </div>
      
      <Card className="w-full max-w-md romantic-card border-2 border-primary/20 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex items-center justify-center gap-3">
            <CardTitle className="text-2xl font-brand font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('createRoom.title')}
            </CardTitle>
          </div>
          
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-primary/30 pulse-romantic">
            <Users className="w-8 h-8 text-primary" />
          </div>
          
          <p className="text-muted-foreground text-center">
            {t('createRoom.subtitle')}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={handleCreateRoom}
              className="w-full h-12 text-lg font-semibold btn-gradient-primary"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('buttons.createRoom')}...
                </>
              ) : (
                t('buttons.createRoom')
              )}
            </Button>
          </div>

          <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
            <h3 className="font-brand font-semibold mb-2">{t('createRoom.howItWorks.title')}</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{t('createRoom.howItWorks.step1')}</li>
              <li>{t('createRoom.howItWorks.step2')}</li>
              <li>{t('createRoom.howItWorks.step3')}</li>
              <li>{t('createRoom.howItWorks.step4')}</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <CreditPurchaseModal 
        open={showCreditModal}
        onOpenChange={setShowCreditModal}
        onPurchaseComplete={() => {
          // After purchase, try creating room again
          setTimeout(() => {
            handleCreateRoom();
          }, 1000);
        }}
      />
    </div>
  );
}

export default function CreateRoom() {
  return (
    <ProtectedRoute>
      <CreateRoomContent />
    </ProtectedRoute>
  );
}
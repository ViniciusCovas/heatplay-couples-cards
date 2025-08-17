import React, { useState, useEffect } from 'react';
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
  // Remove needsCreditConsumption state since we do it synchronously
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, participants, createRoom, leaveRoom, startGame } = useRoomService();
  const { credits, consumeCredit } = useCredits();
  const { t } = useTranslation();

  // Remove the useEffect for credit consumption since we now do it synchronously

  const handleCreateRoom = async (): Promise<void> => {
    console.log('🚀 Starting room creation process', { 
      user: user?.id, 
      credits, 
      level,
      authenticated: !!user 
    });

    // Check if user has credits first
    if (credits < 1) {
      console.log('❌ Insufficient credits', { credits });
      setShowCreditModal(true);
      return;
    }

    setIsCreating(true);
    try {
      console.log('📞 Calling createRoom function...');
      const code = await createRoom(level, user?.id);
      console.log('✅ Room created successfully', { code });
      
      // Consume credit immediately after room creation
      console.log('💰 Consuming credit for room', { code });
      const consumeResult = await consumeCredit(code);
      
      if (!consumeResult.success) {
        console.error('❌ Credit consumption failed', consumeResult);
        if (room) {
          await leaveRoom();
        }
        
        if (consumeResult.error === 'insufficient_credits') {
          toast.error(t('errors.insufficientCredits', 'Créditos insuficientes'));
          setShowCreditModal(true);
        } else {
          toast.error(t('errors.creditConsumption', 'Error al procesar créditos'));
        }
        return;
      }
      
      console.log('✅ Credit consumed successfully');
      setRoomCode(code);
      toast.success(t('messages.roomCreated'));
    } catch (error) {
      console.error('❌ Room creation failed:', error);
      
      // More specific error handling
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Show specific error messages
        if (error.message.includes('row-level security')) {
          toast.error('Permission denied. Please try logging out and back in.');
        } else if (error.message.includes('duplicate')) {
          toast.error('Room code conflict. Please try again.');
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error(t('errors.generic'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleGameStart = async (): Promise<void> => {
    try {
      await startGame(); // Start the game (credit already consumed during room creation)
      // Navigate without room code in URL to prevent global room manager conflicts
      navigate('/proximity-selection', { state: { roomCode, isCreator: true } });
    } catch (error) {
      console.error('❌ Error starting game:', error);
      toast.error('Error starting game');
    }
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
          setShowCreditModal(false);
          // Don't auto-create room, let user click button again
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

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, CheckCircle, Clock } from 'lucide-react';
import { RoomParticipant } from '@/hooks/useRoomService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface WaitingRoomProps {
  roomCode: string;
  participants: RoomParticipant[];
  onGameStart: () => Promise<void>;
  onLeaveRoom: () => void;
}

export function WaitingRoom({ roomCode, participants, onGameStart, onLeaveRoom }: WaitingRoomProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const { t } = useTranslation();

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success(t('waitingRoom.codeCopied'));
    } catch (err) {
      toast.error(t('waitingRoom.copyError'));
    }
  };

  // Start countdown when both players are ready
  useEffect(() => {
    if (participants.length === 2 && participants.every(p => p.is_ready)) {
      if (countdown === null) {
        setCountdown(5);
      }
    } else {
      setCountdown(null);
    }
  }, [participants, countdown]);

  // Countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const start = async () => {
        await onGameStart();
      }
      start();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onGameStart]);

  return (
    <div className="min-h-screen romantic-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md romantic-card border-2 border-primary/20 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <h1 className="text-2xl font-bold">{t('waitingRoom.title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('waitingRoom.subtitle')}
            </p>
          </div>

          {/* Room Code */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{t('waitingRoom.roomCode')}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-3 border-2 border-dashed border-primary/30">
                <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {roomCode}
                </span>
              </div>
              <Button
                onClick={copyRoomCode}
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-primary/10 border-primary/30"
                title={t('waitingRoom.copyCode')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Countdown */}
          {countdown !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-accent-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">{t('waitingRoom.startingIn')}</span>
              </div>
              <div className="text-6xl font-bold text-primary animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Players */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              {t('waitingRoom.players')} ({participants.length}/2)
            </h3>
            <div className="space-y-2">
              {[1, 2].map((playerNum) => {
                const participant = participants[playerNum - 1];
                return (
                  <div
                    key={playerNum}
                    className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-medium">
                        {playerNum}
                      </div>
                      <span className="font-medium">
                        {participant ? t('waitingRoom.player', { playerNum }) : t('waitingRoom.waitingPlayer')}
                      </span>
                    </div>
                    <div>
                      {participant ? (
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          {t('waitingRoom.connected')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t('waitingRoom.disconnected')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          {participants.length < 2 && (
            <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
              <p className="text-sm text-muted-foreground">
                {t('waitingRoom.shareInstruction')}
              </p>
            </div>
          )}

          {/* Leave button */}
          <Button
            onClick={onLeaveRoom}
            variant="outline"
            className="w-full hover:bg-primary/10"
          >
            {t('waitingRoom.leaveRoom')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

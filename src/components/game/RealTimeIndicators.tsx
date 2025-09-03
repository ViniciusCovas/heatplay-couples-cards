import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeIndicatorsProps {
  isConnected: boolean;
  opponentConnected: boolean;
  lastPing?: Date | null;
  isWaitingForOpponent?: boolean;
  timeRemaining?: number;
  className?: string;
}

export const RealTimeIndicators: React.FC<RealTimeIndicatorsProps> = ({
  isConnected,
  opponentConnected,
  lastPing,
  isWaitingForOpponent = false,
  timeRemaining,
  className
}) => {
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = (connected: boolean) => {
    return connected ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20';
  };

  return (
    <div className={cn("flex items-center gap-2 p-2", className)}>
      {/* Your connection status */}
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1 text-xs",
          getConnectionColor(isConnected)
        )}
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        You: {isConnected ? 'Connected' : 'Disconnected'}
      </Badge>

      {/* Opponent connection status */}
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1 text-xs",
          getConnectionColor(opponentConnected)
        )}
      >
        <User className="h-3 w-3" />
        Opponent: {opponentConnected ? 'Connected' : 'Disconnected'}
      </Badge>

      {/* Waiting indicator */}
      {isWaitingForOpponent && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs bg-secondary/10 text-secondary border-secondary/20">
          <Clock className="h-3 w-3 animate-pulse" />
          Waiting...
        </Badge>
      )}

      {/* Countdown timer */}
      {timeRemaining !== undefined && timeRemaining > 0 && (
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1 text-xs",
            timeRemaining <= 10 
              ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" 
              : "bg-warning/10 text-warning border-warning/20"
          )}
        >
          <Clock className="h-3 w-3" />
          {formatTimeRemaining(timeRemaining)}
        </Badge>
      )}

      {/* Last ping indicator */}
      {lastPing && (
        <span className="text-xs text-muted-foreground">
          Last sync: {new Date(lastPing).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
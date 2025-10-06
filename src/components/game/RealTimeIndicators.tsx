import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, User, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeIndicatorsProps {
  isConnected: boolean;
  opponentConnected: boolean;
  lastPing?: Date | null;
  isWaitingForOpponent?: boolean;
  timeRemaining?: number;
  className?: string;
  onReconnect?: () => void; // PHASE 4: Add reconnect callback
}

export const RealTimeIndicators: React.FC<RealTimeIndicatorsProps> = ({
  isConnected,
  opponentConnected,
  lastPing,
  isWaitingForOpponent = false,
  timeRemaining,
  className,
  onReconnect
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

  const getConnectionLabel = (connected: boolean) => {
    return connected ? 'Connected' : 'Disconnected';
  };

  return (
    <div className={cn("flex items-center gap-2 p-2 flex-wrap", className)}>
      {/* PHASE 4: Connection Status Indicator */}
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
        {getConnectionLabel(isConnected)}
      </Badge>

      {/* PHASE 4: Manual Reconnect Button (shown when disconnected) */}
      {!isConnected && onReconnect && (
        <Badge 
          variant="outline" 
          className="flex items-center gap-1 text-xs bg-accent/10 text-accent border-accent/20 cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={onReconnect}
        >
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </Badge>
      )}

      {/* Opponent Connection Status */}
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1 text-xs",
          getConnectionColor(opponentConnected)
        )}
      >
        <User className="h-3 w-3" />
        Opponent {opponentConnected ? 'Online' : 'Offline'}
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
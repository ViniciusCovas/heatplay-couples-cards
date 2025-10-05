import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DebugBarProps {
  playerId: string;
  authUserId?: string;
  effectivePlayerId: string;
  playerNumber?: number;
  dbCurrentPhase?: string;
  dbCurrentTurn?: string;
  dbCurrentCard?: string;
  localGamePhase: string;
  pendingEvaluation: boolean;
  pendingEvaluationResponseId?: string;
  lastSyncTime?: Date;
  lastStateTransition?: Date;
}

export const DebugBar = ({
  playerId,
  authUserId,
  effectivePlayerId,
  playerNumber,
  dbCurrentPhase,
  dbCurrentTurn,
  dbCurrentCard,
  localGamePhase,
  pendingEvaluation,
  pendingEvaluationResponseId,
  lastSyncTime,
  lastStateTransition
}: DebugBarProps) => {
  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 bg-yellow-50 border-yellow-300 z-50 max-w-4xl mx-auto">
      <div className="text-xs font-mono space-y-2">
        <div className="font-bold text-yellow-900 mb-2">🔍 DEBUG MODE</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-semibold text-yellow-800">Player Identity:</div>
            <div>playerId: <Badge variant="outline">{playerId.slice(0, 8)}...</Badge></div>
            <div>authUid: <Badge variant="outline">{authUserId ? authUserId.slice(0, 8) + '...' : 'none'}</Badge></div>
            <div>effectivePlayerId: <Badge variant="outline">{effectivePlayerId.slice(0, 8)}...</Badge></div>
            <div>playerNumber: <Badge variant={playerNumber ? "default" : "destructive"}>{playerNumber || 'undefined'}</Badge></div>
          </div>
          
          <div>
            <div className="font-semibold text-yellow-800">Database State:</div>
            <div>current_phase: <Badge variant="secondary">{dbCurrentPhase || 'N/A'}</Badge></div>
            <div>current_turn: <Badge variant="secondary">{dbCurrentTurn || 'N/A'}</Badge></div>
            <div>current_card: <Badge variant="outline">{dbCurrentCard ? dbCurrentCard.slice(0, 8) + '...' : 'N/A'}</Badge></div>
          </div>
          
          <div>
            <div className="font-semibold text-yellow-800">Local State:</div>
            <div>local gamePhase: <Badge variant="default">{localGamePhase}</Badge></div>
            <div>pendingEvaluation: <Badge variant={pendingEvaluation ? "default" : "destructive"}>{pendingEvaluation ? 'YES' : 'NO'}</Badge></div>
            {pendingEvaluation && pendingEvaluationResponseId && (
              <div>responseId: <Badge variant="outline">{pendingEvaluationResponseId.slice(0, 8)}...</Badge></div>
            )}
          </div>
          
          <div>
            <div className="font-semibold text-yellow-800">Timestamps:</div>
            <div>Last sync: <span className="text-gray-600">{lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'N/A'}</span></div>
            <div>Last transition: <span className="text-gray-600">{lastStateTransition ? lastStateTransition.toLocaleTimeString() : 'N/A'}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

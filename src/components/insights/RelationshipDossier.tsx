import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, Eye } from 'lucide-react';

interface RelationshipDossierProps {
  insights: any;
  roomCode: string;
}

export const RelationshipDossier: React.FC<RelationshipDossierProps> = ({ insights, roomCode }) => {
  const compatibilityScore = insights.overall_compatibility || 0;
  const relationshipPhase = insights.relationship_phase || 'Building';
  
  const getSecurityLevel = (score: number) => {
    if (score >= 80) return { level: 'CLASSIFIED', color: 'destructive' };
    if (score >= 60) return { level: 'CONFIDENTIAL', color: 'warning' };
    return { level: 'RESTRICTED', color: 'secondary' };
  };

  const security = getSecurityLevel(compatibilityScore);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="border-b border-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="relative">
              <FileText className="w-8 h-8 text-primary" />
              <Lock className="w-4 h-4 text-primary absolute -top-1 -right-1" />
            </div>
            Relationship Intelligence File
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={security.color as any} className="font-mono">
              {security.level}
            </Badge>
            <Badge variant="outline" className="font-mono">
              ID: {roomCode}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          GetClose AI Intelligence System • Analysis Complete
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Header Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Compatibility Index</div>
            <div className="text-2xl font-bold text-primary">{compatibilityScore}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Relationship Phase</div>
            <div className="text-lg font-semibold">{relationshipPhase}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Intelligence Level</div>
            <div className="text-lg font-semibold text-primary">Advanced</div>
          </div>
        </div>

        {/* Classified Notice */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Relationship Intelligence Summary</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This dossier contains exclusive insights about your unique connection patterns, 
            psychological compatibility markers, and relationship trajectory. The following 
            analysis is based on advanced behavioral psychology and relationship science.
          </p>
        </div>

        {/* Key Findings Preview */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Executive Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-background border border-border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">PRIMARY STRENGTH</div>
              <div className="font-medium">Emotional Intimacy</div>
            </div>
            <div className="p-3 bg-background border border-border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">GROWTH VECTOR</div>
              <div className="font-medium">Novelty Integration</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
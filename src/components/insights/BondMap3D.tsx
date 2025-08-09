import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BondMap } from '@/utils/psychologicalAnalysis';
import { Heart, Zap, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BondMap3DProps {
  bondMap: BondMap;
  volatility?: {
    intimacy: number;
    attraction: number;
    honesty: number;
  };
  trends?: {
    closeness: 'rising' | 'stable' | 'declining';
    spark: 'rising' | 'stable' | 'declining';
    anchor: 'rising' | 'stable' | 'declining';
  };
}

export const BondMap3D: React.FC<BondMap3DProps> = ({ 
  bondMap, 
  volatility,
  trends 
}) => {
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);

  const getPillarColor = (value: number) => {
    if (value >= 4.0) return 'hsl(142, 76%, 36%)'; // Emerald-600
    if (value >= 3.0) return 'hsl(217, 91%, 60%)'; // Blue-500
    if (value >= 2.0) return 'hsl(45, 93%, 47%)'; // Yellow-500
    return 'hsl(25, 95%, 53%)'; // Orange-500
  };

  const getTrendIcon = (trend: 'rising' | 'stable' | 'declining') => {
    if (trend === 'rising') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-blue-600" />;
  };

  const getStabilityScore = (value: number, volatilityScore?: number) => {
    if (!volatilityScore) return 'stable';
    const stability = 1 - (volatilityScore / 2.5); // Normalize volatility
    if (stability > 0.7) return 'very stable';
    if (stability > 0.4) return 'stable';
    return 'volatile';
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Heart className="w-3 h-3 text-white" />
          </div>
          3D Bond Map Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on Triangular Theory of Love • Hover for details
        </p>
      </CardHeader>
      
      <CardContent className="relative">
        {/* 3D Triangle Visualization */}
        <div className="relative w-80 h-80 mx-auto mb-6">
          <svg 
            width="320" 
            height="320" 
            viewBox="0 0 320 320" 
            className="absolute inset-0"
          >
            <defs>
              {/* Gradient definitions for each pillar */}
              <radialGradient id="closenessGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getPillarColor(bondMap.closeness)} stopOpacity="0.8" />
                <stop offset="100%" stopColor={getPillarColor(bondMap.closeness)} stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id="sparkGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getPillarColor(bondMap.spark)} stopOpacity="0.8" />
                <stop offset="100%" stopColor={getPillarColor(bondMap.spark)} stopOpacity="0.3" />
              </radialGradient>
              <radialGradient id="anchorGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getPillarColor(bondMap.anchor)} stopOpacity="0.8" />
                <stop offset="100%" stopColor={getPillarColor(bondMap.anchor)} stopOpacity="0.3" />
              </radialGradient>
              
              {/* Shadow filter */}
              <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>
            
            {/* Main triangle structure */}
            <path
              d="M 160 40 L 280 240 L 40 240 Z"
              fill="url(#closenessGradient)"
              stroke="hsl(var(--border))"
              strokeWidth="2"
              className="opacity-20"
            />
            
            {/* Pillar visualization circles */}
            {/* Closeness (Intimacy) - Top */}
            <circle 
              cx="160" 
              cy="60" 
              r={Math.max(12, bondMap.closeness * 8)}
              fill="url(#closenessGradient)"
              stroke={getPillarColor(bondMap.closeness)}
              strokeWidth="3"
              filter="url(#dropShadow)"
              className="cursor-pointer transition-all duration-300 hover:scale-110"
              onMouseEnter={() => setHoveredPillar('closeness')}
              onMouseLeave={() => setHoveredPillar(null)}
            />
            
            {/* Spark (Passion) - Bottom Right */}
            <circle 
              cx="250" 
              cy="220" 
              r={Math.max(12, bondMap.spark * 8)}
              fill="url(#sparkGradient)"
              stroke={getPillarColor(bondMap.spark)}
              strokeWidth="3"
              filter="url(#dropShadow)"
              className="cursor-pointer transition-all duration-300 hover:scale-110"
              onMouseEnter={() => setHoveredPillar('spark')}
              onMouseLeave={() => setHoveredPillar(null)}
            />
            
            {/* Anchor (Commitment) - Bottom Left */}
            <circle 
              cx="70" 
              cy="220" 
              r={Math.max(12, bondMap.anchor * 8)}
              fill="url(#anchorGradient)"
              stroke={getPillarColor(bondMap.anchor)}
              strokeWidth="3"
              filter="url(#dropShadow)"
              className="cursor-pointer transition-all duration-300 hover:scale-110"
              onMouseEnter={() => setHoveredPillar('anchor')}
              onMouseLeave={() => setHoveredPillar(null)}
            />
            
            {/* Connection lines showing relationships */}
            <line 
              x1="160" y1="60" 
              x2="250" y2="220" 
              stroke="hsl(var(--primary))" 
              strokeWidth="2" 
              strokeOpacity="0.3"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
            <line 
              x1="160" y1="60" 
              x2="70" y2="220" 
              stroke="hsl(var(--primary))" 
              strokeWidth="2" 
              strokeOpacity="0.3"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
            <line 
              x1="250" y1="220" 
              x2="70" y2="220" 
              stroke="hsl(var(--primary))" 
              strokeWidth="2" 
              strokeOpacity="0.3"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
          </svg>
          
          {/* Interactive labels with trend indicators */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Heart className="w-4 h-4 text-red-500" />
              {trends?.closeness && getTrendIcon(trends.closeness)}
            </div>
            <div className="font-semibold text-sm">Closeness</div>
            <div 
              className="text-lg font-bold"
              style={{ color: getPillarColor(bondMap.closeness) }}
            >
              {bondMap.closeness.toFixed(1)}
            </div>
            {volatility && (
              <Badge variant="outline" className="text-xs mt-1">
                {getStabilityScore(bondMap.closeness, volatility.intimacy)}
              </Badge>
            )}
          </div>
          
          <div className="absolute bottom-8 right-8 text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
              {trends?.spark && getTrendIcon(trends.spark)}
            </div>
            <div className="font-semibold text-sm">Spark</div>
            <div 
              className="text-lg font-bold"
              style={{ color: getPillarColor(bondMap.spark) }}
            >
              {bondMap.spark.toFixed(1)}
            </div>
            {volatility && (
              <Badge variant="outline" className="text-xs mt-1">
                {getStabilityScore(bondMap.spark, volatility.attraction)}
              </Badge>
            )}
          </div>
          
          <div className="absolute bottom-8 left-8 text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Shield className="w-4 h-4 text-blue-500" />
              {trends?.anchor && getTrendIcon(trends.anchor)}
            </div>
            <div className="font-semibold text-sm">Anchor</div>
            <div 
              className="text-lg font-bold"
              style={{ color: getPillarColor(bondMap.anchor) }}
            >
              {bondMap.anchor.toFixed(1)}
            </div>
            {volatility && (
              <Badge variant="outline" className="text-xs mt-1">
                {getStabilityScore(bondMap.anchor, volatility.honesty)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Hover details */}
        {hoveredPillar && (
          <Card className="absolute top-4 right-4 w-48 border border-primary/30 bg-background/95 backdrop-blur-sm shadow-xl">
            <CardContent className="p-3">
              {hoveredPillar === 'closeness' && (
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Emotional Intimacy
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deep emotional connection and vulnerability sharing
                  </p>
                  <div className="text-xs mt-2">
                    Score: <span className="font-semibold">{bondMap.closeness.toFixed(2)}/5.0</span>
                  </div>
                </div>
              )}
              
              {hoveredPillar === 'spark' && (
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    Passion & Excitement
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Physical attraction and surprising moments together
                  </p>
                  <div className="text-xs mt-2">
                    Score: <span className="font-semibold">{bondMap.spark.toFixed(2)}/5.0</span>
                  </div>
                </div>
              )}
              
              {hoveredPillar === 'anchor' && (
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    Trust & Commitment
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Honesty, reliability, and long-term commitment
                  </p>
                  <div className="text-xs mt-2">
                    Score: <span className="font-semibold">{bondMap.anchor.toFixed(2)}/5.0</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Overall compatibility indicator */}
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <div className="text-sm font-medium">Overall Bond Strength:</div>
            <Badge 
              variant="secondary" 
              className="text-sm font-bold"
              style={{ 
                backgroundColor: `${getPillarColor((bondMap.closeness + bondMap.spark + bondMap.anchor) / 3)}20`,
                color: getPillarColor((bondMap.closeness + bondMap.spark + bondMap.anchor) / 3)
              }}
            >
              {((bondMap.closeness + bondMap.spark + bondMap.anchor) / 3).toFixed(1)}/5.0
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
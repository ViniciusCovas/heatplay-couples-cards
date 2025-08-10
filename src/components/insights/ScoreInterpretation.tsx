import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExplanationTooltip } from './ExplanationTooltip';

interface ScoreInterpretationProps {
  score: number;
  maxScore: number;
  label: string;
  interpretation: string;
  percentile?: string;
  showProgress?: boolean;
  className?: string;
}

export const ScoreInterpretation: React.FC<ScoreInterpretationProps> = ({
  score,
  maxScore,
  label,
  interpretation,
  percentile,
  showProgress = true,
  className = ""
}) => {
  const percentage = (score / maxScore) * 100;
  
  const getScoreLevel = (percentage: number) => {
    if (percentage >= 80) return { label: "Excellent", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (percentage >= 60) return { label: "Strong", color: "text-blue-600 bg-blue-50 border-blue-200" };
    if (percentage >= 40) return { label: "Developing", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { label: "Growing", color: "text-purple-600 bg-purple-50 border-purple-200" };
  };

  const scoreLevel = getScoreLevel(percentage);

  return (
    <div className={`space-y-3 p-4 rounded-lg border bg-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{label}</h4>
          <ExplanationTooltip 
            explanation={interpretation}
            term={`${label} Score`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={scoreLevel.color}>
            {scoreLevel.label}
          </Badge>
          <span className="text-lg font-bold">{score}/{maxScore}</span>
        </div>
      </div>
      
      {showProgress && (
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Growing</span>
            <span>Developing</span>
            <span>Strong</span>
            <span>Excellent</span>
          </div>
        </div>
      )}
      
      {percentile && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{percentile}</span> of couples score lower
        </div>
      )}
      
      <p className="text-sm text-muted-foreground leading-relaxed">
        {interpretation}
      </p>
    </div>
  );
};
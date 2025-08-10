import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface ExplanationTooltipProps {
  explanation: string;
  term?: string;
  className?: string;
}

export const ExplanationTooltip: React.FC<ExplanationTooltipProps> = ({ 
  explanation, 
  term,
  className = "" 
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`p-1 h-auto w-auto hover:bg-primary/10 ${className}`}
          >
            <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-primary" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {term && (
              <div className="font-semibold text-primary">{term}</div>
            )}
            <p className="text-sm">{explanation}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
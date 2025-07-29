import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";

export const CreditBalance = () => {
  const { credits, loading } = useCredits();

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <Coins className="h-3 w-3 mr-1" />
        ...
      </Badge>
    );
  }

  return (
    <Badge variant={credits > 0 ? "default" : "secondary"} className="bg-romantic-primary/10 text-romantic-primary border-romantic-primary/20">
      <Coins className="h-3 w-3 mr-1" />
      {credits} {credits === 1 ? 'crédito' : 'créditos'}
    </Badge>
  );
};
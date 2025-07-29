import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Flame, Infinity } from "lucide-react";
import { creditPackages, useCredits } from "@/hooks/useCredits";

interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

const packageIcons = {
  first_spark: Sparkles,
  date_night_duo: Heart,
  weekend_blaze: Flame,
  endless_heat: Infinity
};

export const CreditPurchaseModal = ({ open, onOpenChange, onPurchaseComplete }: CreditPurchaseModalProps) => {
  const { purchaseCredits, purchasing } = useCredits();

  const handlePurchase = async (packageId: string) => {
    const success = await purchaseCredits(packageId);
    if (success) {
      onPurchaseComplete?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-romantic-primary to-romantic-accent bg-clip-text text-transparent">
            Elige tu Pack de Sesiones
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Necesitas al menos 1 Sesión para empezar a jugar. Tu pareja no perderá esta sala.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {creditPackages.map((pkg) => {
            const IconComponent = packageIcons[pkg.id as keyof typeof packageIcons];
            const savings = pkg.originalPrice ? ((pkg.originalPrice - pkg.price) / pkg.originalPrice * 100).toFixed(0) : null;

            return (
              <Card key={pkg.id} className={`relative p-6 border transition-all hover:shadow-lg ${
                pkg.popular ? 'border-romantic-primary shadow-md' : ''
              }`}>
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-romantic-primary">
                    Más Popular
                  </Badge>
                )}
                {savings && (
                  <Badge variant="secondary" className="absolute -top-2 right-4 bg-green-100 text-green-700">
                    Ahorra {savings}%
                  </Badge>
                )}

                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-romantic-primary/10 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-romantic-primary" />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-romantic-primary">
                      ${pkg.price}
                    </div>
                    {pkg.originalPrice && (
                      <div className="text-sm text-muted-foreground line-through">
                        ${pkg.originalPrice}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      ${(pkg.price / pkg.credits).toFixed(2)} por sesión
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {purchasing ? 'Procesando...' : 'Comprar Ahora'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">¿Qué incluye una Sesión?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Experiencia completa: Chispa → Conexión → Fuego → Sin Filtros</li>
            <li>• Todas las cartas que quieran jugar hasta decidir finalizar</li>
            <li>• Informe de IA personalizado al final</li>
            <li>• Sin límite de tiempo por sesión</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};
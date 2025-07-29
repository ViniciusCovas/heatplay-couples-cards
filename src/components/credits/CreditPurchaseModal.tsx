import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Flame, Infinity, Crown, Zap, Star, Gift } from "lucide-react";
import { creditPackages, useCredits } from "@/hooks/useCredits";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

const popularityStats = {
  first_spark: "Para comenzar",
  date_night_duo: "Elegido por el 65%",
  weekend_blaze: "Mejor valor",
  endless_heat: "Sin límites"
};

export const CreditPurchaseModal = ({ open, onOpenChange, onPurchaseComplete }: CreditPurchaseModalProps) => {
  const { purchaseCredits, purchasing } = useCredits();
  const isMobile = useIsMobile();

  const handlePurchase = async (packageId: string) => {
    const success = await purchaseCredits(packageId);
    if (success) {
      onPurchaseComplete?.();
      onOpenChange(false);
    }
  };

  // Sort packages to put popular one first, then by value
  const sortedPackages = [...creditPackages].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return b.credits - a.credits;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-6xl max-h-[95vh] overflow-hidden",
        isMobile ? "w-[95vw] h-[95vh] p-0" : "sm:max-w-5xl"
      )}>
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-romantic-primary via-romantic-accent to-romantic-secondary p-6 text-white">
          <div className="relative z-10">
            <DialogHeader className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Crown className="h-8 w-8 text-romantic-glow animate-pulse" />
                <DialogTitle className="text-3xl font-brand font-bold text-white">
                  Desbloquea tu Experiencia
                </DialogTitle>
                <Crown className="h-8 w-8 text-romantic-glow animate-pulse" />
              </div>
              <p className="text-white/90 text-lg max-w-2xl mx-auto">
                Elige tu pack de sesiones y comienza a descubrir momentos únicos con tu pareja
              </p>
              <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-white/80">
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>Activación Instantánea</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4" />
                  <span>Garantía 100%</span>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
        </div>

        {/* Content */}
        <div className={cn("p-6", isMobile && "overflow-y-auto")}>
          {/* Packages Grid */}
          <div className={cn(
            "grid gap-4 mb-8",
            isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
          )}>
            {sortedPackages.map((pkg, index) => {
              const IconComponent = packageIcons[pkg.id as keyof typeof packageIcons];
              const savings = pkg.originalPrice ? ((pkg.originalPrice - pkg.price) / pkg.originalPrice * 100).toFixed(0) : null;
              const isPopular = pkg.popular;
              const pricePerSession = (pkg.price / pkg.credits).toFixed(2);

              return (
                <Card 
                  key={pkg.id} 
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:scale-105 group cursor-pointer",
                    isPopular 
                      ? "border-2 border-romantic-primary shadow-2xl shadow-romantic-primary/20 bg-gradient-to-br from-white via-romantic-glow/5 to-romantic-primary/5" 
                      : "border hover:border-romantic-primary/50 hover:shadow-lg",
                    isMobile && isPopular && "order-first"
                  )}
                  onClick={() => handlePurchase(pkg.id)}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-romantic-primary to-romantic-accent text-white font-bold px-4 py-1 rounded-full shadow-lg animate-pulse">
                        <Crown className="h-3 w-3 mr-1" />
                        MÁS POPULAR
                      </Badge>
                    </div>
                  )}
                  
                  {/* Savings Badge */}
                  {savings && (
                    <div className="absolute -top-1 right-4 z-20">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-3 py-1 rounded-full shadow-lg">
                        <Gift className="h-3 w-3 mr-1" />
                        -{savings}%
                      </Badge>
                    </div>
                  )}

                  <div className="p-6 space-y-4 relative z-10">
                    {/* Icon & Stats */}
                    <div className="text-center">
                      <div className={cn(
                        "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110",
                        isPopular 
                          ? "bg-gradient-to-br from-romantic-primary to-romantic-accent shadow-lg" 
                          : "bg-romantic-primary/10 group-hover:bg-romantic-primary/20"
                      )}>
                        <IconComponent className={cn(
                          "h-8 w-8 transition-colors duration-300",
                          isPopular ? "text-white" : "text-romantic-primary"
                        )} />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {popularityStats[pkg.id as keyof typeof popularityStats]}
                      </p>
                    </div>

                    {/* Package Info */}
                    <div className="text-center space-y-2">
                      <h3 className={cn(
                        "font-bold text-xl",
                        isPopular && "text-romantic-primary"
                      )}>
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="text-center space-y-2">
                      <div className="space-y-1">
                        <div className={cn(
                          "text-4xl font-bold",
                          isPopular 
                            ? "bg-gradient-to-r from-romantic-primary to-romantic-accent bg-clip-text text-transparent" 
                            : "text-romantic-primary"
                        )}>
                          ${pkg.price}
                        </div>
                        {pkg.originalPrice && (
                          <div className="text-lg text-muted-foreground line-through">
                            ${pkg.originalPrice}
                          </div>
                        )}
                      </div>
                      
                      {/* Value Indicators */}
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-romantic-primary">
                          ${pricePerSession} por sesión
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pkg.credits} {pkg.credits === 1 ? 'sesión' : 'sesiones'} incluidas
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      disabled={purchasing}
                      className={cn(
                        "w-full font-bold text-base py-3 transition-all duration-300 group-hover:shadow-lg",
                        isPopular 
                          ? "bg-gradient-to-r from-romantic-primary to-romantic-accent hover:from-romantic-accent hover:to-romantic-primary text-white shadow-lg" 
                          : "border-romantic-primary text-romantic-primary hover:bg-romantic-primary hover:text-white"
                      )}
                      variant={isPopular ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(pkg.id);
                      }}
                    >
                      {purchasing ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Procesando...</span>
                        </div>
                      ) : (
                        <span>Elegir Pack</span>
                      )}
                    </Button>
                  </div>

                  {/* Gradient Overlay for Popular */}
                  {isPopular && (
                    <div className="absolute inset-0 bg-gradient-to-br from-romantic-primary/5 via-transparent to-romantic-accent/5 pointer-events-none" />
                  )}
                </Card>
              );
            })}
          </div>

          {/* Features Section */}
          <Card className="p-6 bg-gradient-to-br from-romantic-glow/5 to-romantic-primary/5 border-romantic-primary/20">
            <div className="text-center mb-4">
              <h4 className="text-xl font-bold text-romantic-primary mb-2 flex items-center justify-center space-x-2">
                <Star className="h-5 w-5" />
                <span>¿Qué incluye cada Sesión?</span>
                <Star className="h-5 w-5" />
              </h4>
            </div>
            
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"
            )}>
              {[
                { icon: Sparkles, text: "Experiencia completa: Chispa → Conexión → Fuego → Sin Filtros" },
                { icon: Infinity, text: "Todas las cartas que quieran jugar hasta decidir finalizar" },
                { icon: Zap, text: "Informe de IA personalizado al final" },
                { icon: Heart, text: "Sin límite de tiempo por sesión" }
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/50">
                  <feature.icon className="h-5 w-5 text-romantic-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { Button } from "@/components/ui/button";
import { Heart, Users, MessageCircle, Settings, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/ui/language-selector";

const Home = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          
          {/* Left Side - Hero Content */}
          <div className="space-y-8 text-center lg:text-left">
            {/* Brand */}
            <div className="space-y-2">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('app.title')}</h1>
              </div>
              
              {/* Main Headline */}
              <h2 className="headline-hero text-foreground leading-none">
                {t('app.headline')}
              </h2>
              
              {/* Sub-headline */}
              <p className="sub-headline max-w-lg mx-auto lg:mx-0">
                {t('app.subtitle')}
              </p>
              
              {/* Tagline */}
              <div className="flex items-center justify-center lg:justify-start gap-2 pt-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-lg text-muted-foreground font-medium">
                  {t('app.tagline')}
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-4 max-w-sm mx-auto lg:mx-0">
              <Button 
                onClick={() => navigate('/create-room')}
                className="w-full h-14 text-lg font-semibold btn-gradient-primary text-white border-0"
                size="lg"
              >
                <Users className="w-5 h-5 mr-3" />
                {t('buttons.createRoom')}
              </Button>
              
              <Button 
                onClick={() => navigate('/join-room')}
                className="w-full h-14 text-lg font-semibold btn-gradient-secondary"
                variant="outline"
                size="lg"
              >
                <MessageCircle className="w-5 h-5 mr-3" />
                {t('buttons.joinRoom')}
              </Button>
            </div>

            {/* Age Notice */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                18+ Only
              </span>
            </div>

            {/* Admin & Auth Links */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4">
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin-panel-secret')}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('navigation.admin')}
                </Button>
              )}
              
              <Button 
                onClick={() => navigate('/auth')}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
            </div>
          </div>

          {/* Right Side - Visual/Illustration */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-96 h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center overflow-hidden">
              {/* Animated Chat Bubbles */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-6">
                  {/* Chat Bubble 1 */}
                  <div className="bg-white rounded-2xl p-4 shadow-lg max-w-xs animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary rounded-full"></div>
                      <div className="h-2 bg-muted rounded flex-1"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded w-3/4"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  
                  {/* Chat Bubble 2 */}
                  <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-4 shadow-lg max-w-xs ml-auto text-white animate-pulse" style={{animationDelay: '0.5s'}}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                      <div className="h-2 bg-white/20 rounded flex-1"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-white/20 rounded w-2/3"></div>
                      <div className="h-2 bg-white/20 rounded w-4/5"></div>
                    </div>
                  </div>
                  
                  {/* Typing Indicator */}
                  <div className="bg-white rounded-2xl p-4 shadow-lg max-w-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary rounded-full"></div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Hearts */}
              <div className="absolute top-4 right-4">
                <Heart className="w-6 h-6 text-secondary animate-pulse" />
              </div>
              <div className="absolute bottom-8 left-8">
                <Heart className="w-4 h-4 text-primary animate-pulse" style={{animationDelay: '1s'}} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Features Section */}
        <div className="mt-16 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('levels.iceBreaker')}</h3>
              <p className="text-sm text-muted-foreground">Break the ice with fun conversation starters</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('levels.gettingPersonal')}</h3>
              <p className="text-sm text-muted-foreground">Dive deeper into personal stories</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary via-secondary to-primary rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('levels.intimate')}</h3>
              <p className="text-sm text-muted-foreground">Connect on the deepest level</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
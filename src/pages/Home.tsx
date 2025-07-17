import { Button } from "@/components/ui/button";
import { Heart, Users, MessageCircle, Settings, Sparkles, ArrowRight, Shield, Clock, Zap, Star, TrendingUp, Users2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Logo } from "@/components/ui/animated-logo";
const Home = () => {
  const navigate = useNavigate();
  const {
    isAdmin
  } = useAuth();
  const {
    t
  } = useTranslation();
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{
      animationDelay: '2s'
    }}></div>
      
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center min-h-screen">
          
          {/* Left Side - Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Trust Indicators */}
            <div className="flex items-center justify-center lg:justify-start gap-6 mb-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Shield className="w-4 h-4" />
                <span>{t('home.trustBadge.private')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                <Users2 className="w-4 h-4" />
                <span>{t('home.trustBadge.couples')}</span>
              </div>
            </div>
            
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <Logo size="large" className="mb-4" />
              </div>
              
              {/* AI Tagline */}
              <p className="text-sm text-muted-foreground font-medium">
                {t('app.tagline')}
              </p>
              
              {/* Main Headline */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground leading-tight">
                {t('app.headline')}
              </h1>
              
              {/* Sub-headline */}
              <h2 className="text-xl md:text-2xl font-heading font-medium text-foreground">
                {t('app.subtitle')}
              </h2>
              
              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t('home.subtitle')}
              </p>
              
              {/* Social Proof */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">{t('home.socialProof')}</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons - Mobile First */}
            <div className="space-y-4 max-w-md mx-auto lg:mx-0 pt-4">
              <Button onClick={() => navigate('/create-room')} className="w-full h-16 text-lg font-semibold btn-gradient-primary text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group" size="lg">
                <Users className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                {t('home.buttons.startJourney')}
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button onClick={() => navigate('/join-room')} className="w-full h-16 text-lg font-semibold btn-gradient-secondary group" variant="outline" size="lg">
                <MessageCircle className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                {t('home.buttons.joinPartner')}
              </Button>
            </div>

            {/* Value Props - Compact for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0 pt-6">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{t('home.valueProps.ready')}</span>
              </div>
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-sm text-muted-foreground">{t('home.valueProps.private')}</span>
              </div>
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{t('home.valueProps.instant')}</span>
              </div>
            </div>

            {/* Age Notice */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('home.ageNotice')}
              </span>
            </div>

            {/* Admin & Auth Links */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4">
              {isAdmin && <Button onClick={() => navigate('/admin-panel-secret')} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('navigation.admin')}
                </Button>}
              
              <Button onClick={() => navigate('/auth')} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t('home.buttons.login')}
              </Button>
            </div>
          </div>

          {/* Right Side - Dynamic Visual - Hidden on Mobile */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main Visual Container */}
              <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 rounded-[2rem] flex items-center justify-center overflow-hidden border border-white/20 shadow-2xl">
                
                {/* Floating Elements */}
                <div className="absolute inset-0">
                  {/* Connection Lines */}
                  <div className="absolute top-1/3 left-1/4 w-32 h-px bg-gradient-to-r from-primary to-secondary opacity-60 animate-pulse"></div>
                  <div className="absolute bottom-1/3 right-1/4 w-24 h-px bg-gradient-to-l from-secondary to-primary opacity-60 animate-pulse" style={{
                  animationDelay: '1s'
                }}></div>
                  
                  {/* Heart Icons */}
                  <Heart className="absolute top-8 left-8 w-6 h-6 text-primary animate-heartbeat" />
                  <Heart className="absolute top-12 right-12 w-4 h-4 text-secondary animate-heartbeat" style={{
                  animationDelay: '0.5s'
                }} />
                  <Heart className="absolute bottom-12 left-12 w-5 h-5 text-primary animate-heartbeat" style={{
                  animationDelay: '1s'
                }} />
                  
                  {/* Sparkles */}
                  <Sparkles className="absolute top-20 right-8 w-5 h-5 text-secondary animate-pulse" />
                  <Sparkles className="absolute bottom-20 left-8 w-4 h-4 text-primary animate-pulse" style={{
                  animationDelay: '0.8s'
                }} />
                </div>
                
                {/* Central Content */}
                <div className="relative z-10 text-center p-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Users2 className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {t('home.visual.title')}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span>{t('home.visual.feature1')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{
                      animationDelay: '0.3s'
                    }}></div>
                      <span>{t('home.visual.feature2')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{
                      animationDelay: '0.6s'
                    }}></div>
                      <span>{t('home.visual.feature3')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Ambient Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-[2rem]"></div>
              </div>
              
              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-bold text-foreground">98%</div>
                    <div className="text-xs text-muted-foreground">{t('home.stats.successRate')}</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg border border-secondary/20">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-secondary" />
                  <div>
                    <div className="text-sm font-bold text-foreground">50k+</div>
                    <div className="text-xs text-muted-foreground">{t('home.stats.happyCouples')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-32 mb-16">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('home.features.title')}
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="group text-center space-y-6 p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h4 className="text-xl font-bold text-foreground">{t('home.features.level1.title')}</h4>
              <p className="text-muted-foreground">{t('home.features.level1.description')}</p>
            </div>
            
            <div className="group text-center space-y-6 p-8 rounded-2xl bg-gradient-to-br from-secondary/5 to-transparent border border-secondary/10 hover:border-secondary/20 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h4 className="text-xl font-bold text-foreground">{t('home.features.level2.title')}</h4>
              <p className="text-muted-foreground">{t('home.features.level2.description')}</p>
            </div>
            
            <div className="group text-center space-y-6 p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-primary via-secondary to-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h4 className="text-xl font-bold text-foreground">{t('home.features.level3.title')}</h4>
              <p className="text-muted-foreground">{t('home.features.level3.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default Home;
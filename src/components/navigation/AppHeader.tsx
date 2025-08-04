import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, LogOut, Settings, User } from 'lucide-react';

interface AppHeaderProps {
  onAuthClick?: () => void;
}

export const AppHeader = ({ onAuthClick }: AppHeaderProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define game flow routes where login should be hidden
  const gameFlowRoutes = ['/join-room', '/proximity-selection', '/level-select'];
  const isGameFlow = gameFlowRoutes.includes(location.pathname);
  
  // Show login on marketing/auth pages only
  const showAuthButton = !isGameFlow;

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const handleAuthClick = () => {
    if (onAuthClick) {
      onAuthClick();
    } else {
      navigate('/auth');
    }
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {user?.user_metadata?.full_name || 'User'}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user?.email}
          </p>
        </div>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin-panel-secret')}>
            <Settings className="mr-2 h-4 w-4" />
            {t('navigation.admin')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('auth.signOut', 'Sign Out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const AuthButton = () => (
    <Button 
      onClick={handleAuthClick}
      className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium min-h-[44px] px-6"
      size={isMobile ? "lg" : "default"}
    >
      {t('home.buttons.login')}
    </Button>
  );

  const MobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <div className="flex flex-col space-y-6 mt-6">
          <div className="flex flex-col space-y-3">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/admin-panel-secret');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t('navigation.admin')}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.signOut', 'Sign Out')}
                </Button>
              </div>
            ) : (
              showAuthButton && <AuthButton />
            )}
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-center">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-end px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <LanguageSelector />
          {user ? <UserMenu /> : (showAuthButton && <AuthButton />)}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {!user && showAuthButton && <AuthButton />}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};
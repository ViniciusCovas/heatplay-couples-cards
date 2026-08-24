import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  // Track dismissal instead of calling setState during render.
  // The modal is open whenever the user is unauthenticated and hasn't dismissed it.
  const [dismissed, setDismissed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AuthModal
        open={!dismissed}
        onOpenChange={(open) => setDismissed(!open)}
        onSuccess={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
};

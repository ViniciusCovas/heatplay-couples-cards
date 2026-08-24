import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /**
   * When true, a guest (anonymous) session is NOT enough: the visitor must
   * hold a real account. Used for admin-style areas. Default false, so the
   * play flows (create room) only need *an* identity, which we mint silently.
   */
  requirePermanentAccount?: boolean;
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export const ProtectedRoute = ({
  children,
  fallback,
  requirePermanentAccount = false,
}: ProtectedRouteProps) => {
  const { user, loading, ensureSession, hasPermanentAccount } = useAuth();
  // Track dismissal instead of calling setState during render.
  // The modal is open whenever we must show it and the user hasn't dismissed it.
  const [dismissed, setDismissed] = useState(false);
  // 'idle' -> nothing attempted yet, 'pending' -> anonymous sign-in in flight,
  // 'failed' -> anonymous sign-in unavailable, fall back to the auth modal.
  const [anonState, setAnonState] = useState<'idle' | 'pending' | 'failed'>('idle');
  const attempted = useRef(false);

  // All state changes happen in effects — never during render.
  useEffect(() => {
    if (loading || user || requirePermanentAccount) return;
    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    setAnonState('pending');
    ensureSession()
      .then(({ session, error }) => {
        if (cancelled) return;
        if (session) {
          // The auth listener in AuthContext will flip `user`; nothing else to do.
          setAnonState('idle');
          return;
        }
        logger.warn('ProtectedRoute: falling back to auth modal', error);
        setAnonState('failed');
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error('ProtectedRoute: ensureSession threw', error);
        setAnonState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, requirePermanentAccount, ensureSession]);

  if (loading) {
    return <LoadingScreen />;
  }

  const satisfied = requirePermanentAccount ? hasPermanentAccount : !!user;

  if (satisfied) {
    return <>{children}</>;
  }

  // Guest sessions are fine for play, but not for account-gated areas, and a
  // failed anonymous sign-in must still leave a way in.
  const mustPromptForAccount = requirePermanentAccount || anonState === 'failed';

  if (!mustPromptForAccount) {
    // Anonymous sign-in in flight (or about to start): show the spinner rather
    // than a login wall.
    return <LoadingScreen />;
  }

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
};


import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { identify } from '@/lib/analytics';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface EnsureSessionResult {
  session: Session | null;
  error: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  /**
   * Creates a permanent account. When the visitor is currently playing on an
   * anonymous session this UPGRADES that session in place (same auth.uid()),
   * so rooms, credits and analyses carry over. `upgraded` says which happened.
   */
  signUp: (email: string, password: string) => Promise<{ error: any; upgraded?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  /** true when the current session is a Supabase anonymous (guest) session. */
  isAnonymous: boolean;
  /** true once a durable (email/OAuth) identity is attached to the session. */
  hasPermanentAccount: boolean;
  /**
   * Guarantees an auth.uid() exists, signing in anonymously if needed.
   * Idempotent: concurrent callers share one in-flight sign-in. Never throws —
   * on failure it resolves with `{ session: null, error }` so callers can fall
   * back to the regular auth modal.
   */
  ensureSession: () => Promise<EnsureSessionResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserActivity = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('update_user_activity', {
        user_id_param: userId
      });
      
      if (error) throw error;
      logger.info('User activity updated');
    } catch (error) {
      logger.error('Error updating user activity', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      logger.error('Error fetching profile', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Update user activity on login
          if (event === 'SIGNED_IN') {
            identify(session.user.id);
            setTimeout(() => {
              updateUserActivity(session.user.id);
            }, 0);
          }
          
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  // One shared in-flight anonymous sign-in, so double clicks / concurrent
  // callers never create two guest identities.
  const ensureSessionInFlight = useRef<Promise<EnsureSessionResult> | null>(null);

  const ensureSession = useCallback(async (): Promise<EnsureSessionResult> => {
    try {
      // Always ask the client (not React state) so we cannot race the provider.
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        return { session: existing, error: null };
      }
    } catch (error) {
      logger.error('ensureSession: could not read current session', error);
      return { session: null, error };
    }

    if (ensureSessionInFlight.current) {
      logger.debug('ensureSession: reusing in-flight anonymous sign-in');
      return ensureSessionInFlight.current;
    }

    const attempt = (async (): Promise<EnsureSessionResult> => {
      try {
        logger.info('ensureSession: no session, signing in anonymously');
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data?.session) {
          // Most likely cause: anonymous sign-ins are disabled in the Supabase
          // dashboard (see supabase/DEPLOYMENT.md). Fail closed — the caller
          // falls back to the normal auth modal.
          logger.error('ensureSession: anonymous sign-in failed', error);
          return { session: null, error: error ?? new Error('anonymous_sign_in_unavailable') };
        }
        logger.info('ensureSession: anonymous session created');
        return { session: data.session, error: null };
      } catch (error) {
        logger.error('ensureSession: anonymous sign-in threw', error);
        return { session: null, error };
      } finally {
        ensureSessionInFlight.current = null;
      }
    })();

    ensureSessionInFlight.current = attempt;
    return attempt;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // If the visitor is already playing as a guest, link the credentials to
    // that same auth.uid() instead of creating a second, empty account.
    let currentSession: Session | null = null;
    try {
      currentSession = (await supabase.auth.getSession()).data.session;
    } catch (error) {
      logger.warn('signUp: could not read current session, falling back to plain signUp', error);
    }

    if (currentSession?.user?.is_anonymous) {
      logger.info('signUp: upgrading anonymous session to a permanent account');
      const { error } = await supabase.auth.updateUser(
        { email, password },
        { emailRedirectTo: redirectUrl }
      );
      if (error) {
        // Fail closed: surface the error (e.g. "email already registered") so
        // the user can sign in instead. We never silently drop their data.
        logger.error('signUp: anonymous upgrade failed', error);
        return { error, upgraded: true };
      }
      logger.info('signUp: anonymous session upgraded, uid preserved');
      return { error: null, upgraded: true };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error, upgraded: false };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const isAnonymous = useMemo(() => user?.is_anonymous === true, [user?.is_anonymous]);

  // A guest session can never be an admin, whatever the profile row says.
  const isAdmin = useMemo(
    () => profile?.role === 'admin' && !isAnonymous,
    [profile?.role, isAnonymous]
  );

  const hasPermanentAccount = useMemo(() => !!user && !isAnonymous, [user, isAnonymous]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isAdmin,
    isAnonymous,
    hasPermanentAccount,
    ensureSession,
  }), [user, session, profile, loading, signIn, signUp, signInWithGoogle, signOut, isAdmin, isAnonymous, hasPermanentAccount, ensureSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

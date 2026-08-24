import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface PremiumSubscription {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly' | null;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_end: string | null;
  partner_user_id: string | null;
}

interface PremiumState {
  isPremium: boolean;
  subscription: PremiumSubscription | null;
  /** true when the current user owns the subscription (can link a partner) */
  isOwner: boolean;
}

// The subscriptions table / RPCs are newer than the generated types file, so
// we go through an untyped client handle for these calls only.
const db = supabase as any;

async function fetchPremiumState(userId: string): Promise<PremiumState> {
  const [{ data: hasPremium, error: rpcError }, { data: subs, error: subError }] =
    await Promise.all([
      db.rpc('has_premium', { p_user_id: userId }),
      db
        .from('subscriptions')
        .select('id, user_id, plan, status, current_period_end, partner_user_id')
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1),
    ]);

  if (rpcError) logger.error('has_premium rpc failed', rpcError);
  if (subError) logger.error('subscriptions fetch failed', subError);

  const subscription: PremiumSubscription | null = subs?.[0] ?? null;
  return {
    isPremium: hasPremium === true,
    subscription,
    isOwner: subscription?.user_id === userId,
  };
}

export const usePremium = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<PremiumState>({
    queryKey: ['premium', user?.id],
    queryFn: () => fetchPremiumState(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  /**
   * Link the partner (by email) to the caller's active subscription.
   * Returns the server error code on failure, null on success.
   */
  const linkPartner = async (partnerEmail: string): Promise<string | null> => {
    try {
      const { data, error } = await db.rpc('set_subscription_partner', {
        partner_email: partnerEmail,
      });
      if (error) throw error;
      if (data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['premium', user?.id] });
        return null;
      }
      return typeof data?.error === 'string' ? data.error : 'unknown';
    } catch (err) {
      logger.error('set_subscription_partner failed', err);
      return 'unknown';
    }
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['premium', user?.id] });

  return {
    isPremium: query.data?.isPremium ?? false,
    subscription: query.data?.subscription ?? null,
    isOwner: query.data?.isOwner ?? false,
    loading: !!user && query.isLoading,
    linkPartner,
    refresh,
  };
};

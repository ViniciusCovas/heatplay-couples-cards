import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  description: string;
  popular?: boolean;
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'first_spark',
    name: 'First Spark',
    credits: 1,
    price: 3.50,
    description: '1 Sesión completa'
  },
  {
    id: 'date_night_duo',
    name: 'Date-Night Duo',
    credits: 2,
    price: 5.00,
    originalPrice: 7.00,
    description: '2 Sesiones',
    popular: true
  },
  {
    id: 'weekend_blaze',
    name: 'Weekend Blaze',
    credits: 4,
    price: 9.00,
    originalPrice: 14.00,
    description: '4 Sesiones'
  },
  {
    id: 'endless_heat',
    name: 'Endless Heat Pass',
    credits: 10,
    price: 17.50,
    originalPrice: 35.00,
    description: '10 Sesiones'
  }
];

// Type guard for credit consumption result
interface CreditConsumptionResult {
  success: boolean;
  error?: string;
  new_balance?: number;
  room_id?: string;
}

const isCreditConsumptionResult = (data: unknown): data is CreditConsumptionResult => {
  return !!data && typeof data === 'object' && 'success' in (data as any);
};

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching credits', error);
      }

      setCredits(data?.balance || 0);
    } catch (error) {
      logger.error('Error fetching credits', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async (packageId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar créditos');
      return false;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { package_type: packageId }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
        return true;
      }
    } catch (error) {
      logger.error('Error purchasing credits', error);
      toast.error('Error al procesar el pago');
      return false;
    } finally {
      setPurchasing(false);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      if (data.success) {
        await fetchCredits(); // Refresh credits
        toast.success(`¡${data.credits_added} crédito${data.credits_added > 1 ? 's' : ''} añadido${data.credits_added > 1 ? 's' : ''} a tu cuenta!`);
        return true;
      }
    } catch (error) {
      logger.error('Error verifying payment', error);
      toast.error('Error al verificar el pago');
    }
    return false;
  };

  const consumeCredit = async (roomCodeOrId: string): Promise<{ success: boolean; error?: string; new_balance?: number }> => {
    if (!user) {
      return { success: false, error: 'not_authenticated' };
    }

    try {
      // Try using the new room code-based function first
      const { data, error } = await supabase.rpc('consume_credit_for_room', {
        room_code_param: roomCodeOrId,
        user_id_param: user.id
      });

      if (error) {
        console.error('Error consuming credit:', error);
        return { success: false, error: error.message };
      }

      if (!isCreditConsumptionResult(data)) {
        return { success: false, error: 'invalid_response' };
      }

      if (data.success) {
        await fetchCredits(); // Refresh credit balance
        return { 
          success: true, 
          new_balance: data.new_balance 
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'unknown_error' 
        };
      }
    } catch (error) {
      console.error('Unexpected error consuming credit:', error);
      return { success: false, error: 'network_error' };
    }
  };

  useEffect(() => {
    fetchCredits();

    // Listen for credit changes
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    credits,
    loading,
    purchasing,
    fetchCredits,
    purchaseCredits,
    verifyPayment,
    consumeCredit
  };
};
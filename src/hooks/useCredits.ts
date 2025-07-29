import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
        console.error('Error fetching credits:', error);
      }

      setCredits(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
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
      console.error('Error purchasing credits:', error);
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
      console.error('Error verifying payment:', error);
      toast.error('Error al verificar el pago');
    }
    return false;
  };

  const consumeCredit = async (roomId: string) => {
    if (!user) return { success: false, error: 'not_authenticated' };

    try {
      const { data, error } = await supabase.rpc('consume_credit', {
        room_id_param: roomId,
        user_id_param: user.id
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        setCredits(result.new_balance);
        return { success: true, sessionId: result.session_id };
      } else {
        return { success: false, error: result?.error, balance: result?.balance };
      }
    } catch (error) {
      console.error('Error consuming credit:', error);
      return { success: false, error: 'server_error' };
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
-- Add unique constraint on user_id column in credits table
-- This is required for the add_credits function's ON CONFLICT clause to work
ALTER TABLE public.credits ADD CONSTRAINT credits_user_id_unique UNIQUE (user_id);

-- Manually add the credit for the user whose payment succeeded but verification failed
-- User ID: 755c2600-53d1-496e-98b5-75a99e042cfe (from the Stripe logs)
-- Amount: 1 credit (from the failed payment)
INSERT INTO public.credits (user_id, balance, total_purchased)
VALUES ('755c2600-53d1-496e-98b5-75a99e042cfe'::uuid, 1, 1)
ON CONFLICT (user_id) DO UPDATE SET
  balance = public.credits.balance + 1,
  total_purchased = public.credits.total_purchased + 1,
  updated_at = now();
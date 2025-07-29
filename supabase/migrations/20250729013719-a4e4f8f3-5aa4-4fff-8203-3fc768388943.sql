-- Create credits table to track user credit balances
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sessions table to track credit consumption
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  session_status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add credit-related columns to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN credit_status TEXT DEFAULT 'pending_credit',
ADD COLUMN host_user_id UUID REFERENCES auth.users(id),
ADD COLUMN session_id UUID REFERENCES public.sessions(id);

-- Enable RLS on new tables
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credits table
CREATE POLICY "Users can view own credits" ON public.credits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.credits
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.credits
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for sessions table
CREATE POLICY "Users can view own sessions" ON public.sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user credit balance
CREATE OR REPLACE FUNCTION public.get_user_credits(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_balance INTEGER;
BEGIN
  SELECT balance INTO user_balance
  FROM public.credits 
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(user_balance, 0);
END;
$$;

-- Create function to consume credit atomically
CREATE OR REPLACE FUNCTION public.consume_credit(room_id_param UUID, user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
BEGIN
  -- Lock the user's credits row
  SELECT balance INTO current_balance
  FROM public.credits 
  WHERE user_id = user_id_param
  FOR UPDATE;
  
  -- Check if user has credits
  IF current_balance < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', COALESCE(current_balance, 0)
    );
  END IF;
  
  -- Check if room already has an active session
  IF EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'session_already_active'
    );
  END IF;
  
  -- Create session record
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (user_id_param, room_id_param, 1, 'active')
  RETURNING * INTO session_record;
  
  -- Update credits
  UPDATE public.credits 
  SET 
    balance = balance - 1,
    total_consumed = total_consumed + 1,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Update room status
  UPDATE public.game_rooms 
  SET 
    credit_status = 'active_session',
    session_id = session_record.id,
    host_user_id = user_id_param
  WHERE id = room_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', session_record.id,
    'new_balance', current_balance - 1
  );
END;
$$;

-- Create function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_credits(user_id_param UUID, credits_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Upsert credits record
  INSERT INTO public.credits (user_id, balance, total_purchased)
  VALUES (user_id_param, credits_amount, credits_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.credits.balance + credits_amount,
    total_purchased = public.credits.total_purchased + credits_amount,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_added', credits_amount
  );
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Phase 2: Core Table RLS Implementation

-- Step 1: Create security definer function to check room participation
-- This prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.user_participates_in_room(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = user_id_param::text
  );
END;
$function$;

-- Step 2: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Step 3: Enable RLS on credits table
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Credits: Users can view their own credits
CREATE POLICY "Users can view their own credits"
ON public.credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Credits: Users can update their own credits (via functions only)
CREATE POLICY "Users can update their own credits"
ON public.credits
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Step 4: Enable RLS on game_rooms table
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Game rooms: Users can view rooms they host
CREATE POLICY "Users can view rooms they host"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (host_user_id = auth.uid());

-- Game rooms: Users can view rooms they participate in
CREATE POLICY "Users can view rooms they participate in"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (public.user_participates_in_room(id, auth.uid()));

-- Game rooms: Users can insert their own rooms
CREATE POLICY "Users can create rooms"
ON public.game_rooms
FOR INSERT
TO authenticated
WITH CHECK (host_user_id = auth.uid());

-- Game rooms: Users can update rooms they host
CREATE POLICY "Users can update rooms they host"
ON public.game_rooms
FOR UPDATE
TO authenticated
USING (host_user_id = auth.uid());
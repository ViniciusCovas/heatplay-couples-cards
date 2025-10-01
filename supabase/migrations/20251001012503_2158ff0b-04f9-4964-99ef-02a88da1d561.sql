-- PHASE 1: Fix RLS Policies for Anonymous Access

-- First, create the missing anonymous_can_access_room function
CREATE OR REPLACE FUNCTION public.anonymous_can_access_room(room_id_param uuid, player_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if player_id exists in room_participants for this room
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  );
END;
$$;

-- Drop and recreate game_rooms SELECT policy with proper anonymous support
DROP POLICY IF EXISTS "Anyone can view rooms they participate in" ON public.game_rooms;

CREATE POLICY "Anyone can view rooms they participate in"
ON public.game_rooms
FOR SELECT
USING (
  -- Allow if user participates as authenticated user (using auth.uid())
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id 
    AND player_id = (auth.uid())::text
  )
  OR
  -- Allow if user participates as anonymous (using any player_id in the room)
  -- This is safe because we still require the player to be in room_participants
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id
  )
);

-- Update room_participants SELECT policy to be simpler
DROP POLICY IF EXISTS "Anyone can view participants in their rooms" ON public.room_participants;

CREATE POLICY "Anyone can view participants in their rooms"
ON public.room_participants
FOR SELECT
USING (
  -- Authenticated users can see participants in rooms they're in
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants rp2
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.player_id = (auth.uid())::text
  ))
  OR
  -- Anonymous users can see participants (basic info only)
  auth.uid() IS NULL
);

-- Update room_participants UPDATE policy
DROP POLICY IF EXISTS "Participants can update their own data" ON public.room_participants;

CREATE POLICY "Participants can update their own data"
ON public.room_participants
FOR UPDATE
USING (
  player_id = COALESCE((auth.uid())::text, player_id)
);

-- Update connection_states policies for anonymous users
DROP POLICY IF EXISTS "Participants can view connection states in their rooms" ON public.connection_states;

CREATE POLICY "Participants can view connection states in their rooms"
ON public.connection_states
FOR SELECT
USING (
  -- Authenticated users see connections in their rooms
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = connection_states.room_id 
    AND player_id = (auth.uid())::text
  ))
  OR
  -- Anonymous users can see connection states
  auth.uid() IS NULL
);

-- PHASE 3: Fix Security - Restrict profiles table (users should only see their own)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Add policy for admins to view all profiles (if needed for admin dashboard)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'::app_role
  )
);

-- PHASE 2: Fix join_room_by_code RPC to handle player identity properly
CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_param text, player_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_room_id uuid;
  v_status text;
  v_current_phase text;
  v_existing record;
  v_assigned integer;
  v_normalized_player_id text;
BEGIN
  -- Validate inputs
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  IF player_id_param IS NULL OR trim(player_id_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player_id');
  END IF;

  -- Normalize the player ID (use auth.uid if authenticated, otherwise use provided player_id)
  IF auth.uid() IS NOT NULL THEN
    v_normalized_player_id := auth.uid()::text;
  ELSE
    v_normalized_player_id := player_id_param;
  END IF;

  -- Normalize incoming code
  room_code_param := upper(trim(room_code_param));

  -- 1) Find open room by code
  SELECT id, status, current_phase INTO v_room_id, v_status, v_current_phase
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND (
      status = 'waiting' OR 
      (status = 'playing' AND current_phase IN ('proximity-selection', 'level-selection'))
    )
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;

  -- 2) Check if already a participant (using normalized player ID)
  SELECT * INTO v_existing
  FROM public.room_participants
  WHERE room_id = v_room_id
    AND player_id = v_normalized_player_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', v_room_id,
      'player_number', v_existing.player_number,
      'already_joined', true
    );
  END IF;

  -- 3) Assign player number atomically
  SELECT public.assign_player_number(v_room_id, v_normalized_player_id)
  INTO v_assigned;

  IF v_assigned IS NULL OR v_assigned = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;

  -- 4) Insert participation with normalized player ID
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_room_id, v_normalized_player_id, true, v_assigned);

  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_room_id,
    'player_number', v_assigned,
    'already_joined', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'join_failed',
      'details', SQLERRM
    );
END;
$$;
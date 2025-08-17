-- Final fix for anonymous user room joining
-- The issue is that join_room_by_code function needs SECURITY DEFINER to bypass RLS

-- Update the join_room_by_code function to properly handle anonymous users
CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_param text, player_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_status text;
  v_existing record;
  v_assigned integer;
BEGIN
  -- Validate inputs
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  IF player_id_param IS NULL OR trim(player_id_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player_id');
  END IF;

  -- Normalize incoming code
  room_code_param := upper(trim(room_code_param));

  -- 1) Find open room by code (waiting or playing)
  SELECT id, status INTO v_room_id, v_status
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND status IN ('waiting','playing')
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;

  -- 2) Ensure room is still open via helper
  IF NOT public.room_is_open(v_room_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_closed');
  END IF;

  -- 3) Already a participant?
  SELECT * INTO v_existing
  FROM public.room_participants
  WHERE room_id = v_room_id
    AND player_id = player_id_param
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', v_room_id,
      'player_number', v_existing.player_number,
      'already_joined', true
    );
  END IF;

  -- 4) Assign player number atomically
  SELECT public.assign_player_number(v_room_id, player_id_param)
  INTO v_assigned;

  IF v_assigned IS NULL OR v_assigned = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;

  -- 5) Insert participation
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_room_id, player_id_param, true, v_assigned);

  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_room_id,
    'player_number', v_assigned,
    'already_joined', false
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return a safe error payload with more detail for debugging
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'join_failed',
      'details', SQLERRM
    );
END;
$function$;

-- Update the room_is_open function to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.room_is_open(room_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE id = room_id_param
      AND status IN ('waiting', 'playing')
  );
$function$;

-- Update functions used by the join process to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_player_number(room_id_param uuid, player_id_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  player_num integer;
BEGIN
  SELECT player_number INTO player_num
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param
  LIMIT 1;
  
  RETURN COALESCE(player_num, 0);
END;
$function$;

-- Create function to check if user participates in room (needed for RLS bypass)
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

-- Create function that checks if user is participant (for both authenticated and anonymous)
CREATE OR REPLACE FUNCTION public.is_user_participant(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle both authenticated users (by UUID) and anonymous users (by checking player_id)
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND (
      player_id = user_id_param::text OR 
      (user_id_param IS NOT NULL AND player_id = user_id_param::text)
    )
  );
END;
$function$;
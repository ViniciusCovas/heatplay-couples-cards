
BEGIN;

CREATE OR REPLACE FUNCTION public.join_room_by_code(
  room_code_param text,
  player_id_param text
)
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
    -- Return a safe error payload; details can be checked in logs
    RETURN jsonb_build_object('success', false, 'error', 'join_failed');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.join_room_by_code(text, text) TO anon, authenticated;

COMMIT;

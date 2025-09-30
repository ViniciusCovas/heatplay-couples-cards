-- Update join_room_by_code to allow joining during early game phases
CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_param text, player_id_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_status text;
  v_current_phase text;
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

  -- 1) Find open room by code (waiting or early playing phases)
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

  -- 2) Already a participant?
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

  -- 3) Assign player number atomically
  SELECT public.assign_player_number(v_room_id, player_id_param)
  INTO v_assigned;

  IF v_assigned IS NULL OR v_assigned = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;

  -- 4) Insert participation
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
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'join_failed',
      'details', SQLERRM
    );
END;
$function$;
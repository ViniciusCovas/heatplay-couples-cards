-- Clean up stuck rooms and fix credit status inconsistencies
UPDATE public.game_rooms 
SET 
  credit_status = 'active_session',
  current_phase = 'proximity-selection'
WHERE 
  status = 'playing' 
  AND credit_status = 'pending_credit'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Clean up orphaned room participants (rooms that don't exist)
DELETE FROM public.room_participants 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

-- Add function to prevent navigation away from waiting room during credit consumption
CREATE OR REPLACE FUNCTION public.check_room_credit_status(room_code_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  room_info RECORD;
BEGIN
  SELECT 
    id,
    status,
    credit_status,
    host_user_id
  INTO room_info
  FROM public.game_rooms 
  WHERE room_code = room_code_param;
  
  IF room_info IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  
  RETURN jsonb_build_object(
    'status', 'found',
    'room_id', room_info.id,
    'room_status', room_info.status,
    'credit_status', room_info.credit_status,
    'host_user_id', room_info.host_user_id
  );
END;
$function$;
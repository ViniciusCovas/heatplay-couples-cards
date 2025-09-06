-- Fix the ambiguous column reference in detect_disconnected_players function
CREATE OR REPLACE FUNCTION public.detect_disconnected_players()
 RETURNS TABLE(room_id uuid, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  disconnected_room RECORD;
BEGIN
  -- Only mark players as disconnected after 30 minutes of inactivity
  -- This respects natural thinking time and conversation flow
  
  FOR disconnected_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gr.room_code
    FROM public.game_rooms gr
    JOIN public.connection_states cs ON gr.id = cs.room_id
    WHERE gr.status = 'playing'
      AND gr.created_at > NOW() - INTERVAL '2 hours'
      AND cs.last_ping < NOW() - INTERVAL '30 minutes'  -- 30 minutes instead of 2
      AND cs.connection_status = 'connected'
  LOOP
    -- Update connection status only (don't force game actions)
    -- Fixed: Specify table alias to avoid ambiguous column reference
    UPDATE public.connection_states 
    SET 
      connection_status = 'disconnected',
      updated_at = NOW()
    WHERE connection_states.room_id = disconnected_room.room_id
      AND last_ping < NOW() - INTERVAL '30 minutes';
    
    RETURN QUERY SELECT disconnected_room.room_id, 'detected_disconnection'::text;
    
    RAISE LOG 'Detected disconnection after 30 minutes: room %', disconnected_room.room_id;
  END LOOP;
END;
$function$
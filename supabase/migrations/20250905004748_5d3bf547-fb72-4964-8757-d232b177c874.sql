-- Drop existing functions first
DROP FUNCTION IF EXISTS public.auto_advance_stuck_evaluations();
DROP FUNCTION IF EXISTS public.detect_disconnected_players();

-- Recreate the auto_advance_stuck_evaluations function with the correct column reference
CREATE OR REPLACE FUNCTION public.auto_advance_stuck_evaluations()
RETURNS TABLE(room_id uuid, action_taken text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation phase for more than 2 minutes with pending responses
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn,
      COUNT(DISTINCT gres.id) as pending_evaluations
    FROM public.game_rooms gr
    LEFT JOIN public.game_responses gres ON gr.id = gres.room_id 
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
    WHERE gr.current_phase = 'evaluation'
      AND gr.status = 'playing'
      AND gr.created_at > NOW() - INTERVAL '2 hours'  -- Use created_at instead of updated_at
      AND gr.created_at < NOW() - INTERVAL '2 minutes'  -- Stuck for at least 2 minutes
    GROUP BY gr.id, gr.room_code, gr.current_phase, gr.current_turn
    HAVING COUNT(DISTINCT gres.id) > 0
  LOOP
    -- Update the response with a system evaluation to unblock the game
    UPDATE public.game_responses 
    SET 
      evaluation = 'System auto-evaluation: Good connection!',
      evaluation_by = CASE 
        WHEN stuck_room.current_turn = 'player1' THEN 
          (SELECT player_id FROM public.room_participants WHERE room_id = stuck_room.room_id AND player_number = 1 LIMIT 1)
        ELSE 
          (SELECT player_id FROM public.room_participants WHERE room_id = stuck_room.room_id AND player_number = 2 LIMIT 1)
      END
    WHERE room_id = stuck_room.room_id 
      AND response IS NOT NULL 
      AND evaluation IS NULL
      AND id IN (
        SELECT id FROM public.game_responses 
        WHERE room_id = stuck_room.room_id 
          AND response IS NOT NULL 
          AND evaluation IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
      );
    
    RETURN QUERY SELECT stuck_room.room_id, 'auto_evaluated_stuck_response'::text;
  END LOOP;
END;
$function$;

-- Recreate the detect_disconnected_players function  
CREATE OR REPLACE FUNCTION public.detect_disconnected_players()
RETURNS TABLE(room_id uuid, action_taken text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  disconnected_room RECORD;
BEGIN
  -- Find rooms where players haven't been active for more than 5 minutes
  FOR disconnected_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gr.room_code,
      gr.status
    FROM public.game_rooms gr
    JOIN public.room_participants rp ON gr.id = rp.room_id
    WHERE gr.status = 'playing'
      AND gr.created_at > NOW() - INTERVAL '2 hours'  -- Use created_at instead of updated_at
      AND rp.last_activity < NOW() - INTERVAL '5 minutes'
    GROUP BY gr.id, gr.room_code, gr.status
    HAVING COUNT(DISTINCT rp.player_id) = 1  -- Only one player remaining
  LOOP
    -- Mark room as abandoned due to disconnection
    UPDATE public.game_rooms 
    SET 
      status = 'finished',
      current_phase = 'disconnected',
      finished_at = NOW()
    WHERE id = disconnected_room.room_id;
    
    RETURN QUERY SELECT disconnected_room.room_id, 'marked_as_disconnected'::text;
  END LOOP;
END;
$function$;
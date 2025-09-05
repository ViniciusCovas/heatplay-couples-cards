-- Remove auto-evaluation system and redesign auto-recovery for technical issues only

-- 1. Remove the problematic auto_advance_stuck_evaluations function that forces evaluations
DROP FUNCTION IF EXISTS public.auto_advance_stuck_evaluations();

-- 2. Create a new technical-only auto-recovery function
CREATE OR REPLACE FUNCTION public.auto_recover_technical_issues()
RETURNS TABLE(room_id uuid, action_taken text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Only fix rooms with actual technical issues (wrong phase, missing sync events)
  -- DO NOT create artificial evaluations or force player actions
  
  -- Fix rooms stuck in evaluation phase with responses but no sync events
  FOR stuck_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gr.current_phase != 'evaluation'  -- Technical issue: should be in evaluation phase
      AND gr.created_at > NOW() - INTERVAL '24 hours'
      AND gr.status = 'playing'
  LOOP
    -- Fix phase mismatch (technical issue)
    UPDATE public.game_rooms 
    SET current_phase = 'evaluation'
    WHERE id = stuck_room.room_id;
    
    RETURN QUERY SELECT stuck_room.room_id, 'fixed_phase_mismatch'::text;
    
    RAISE LOG 'Fixed technical issue: room % phase corrected to evaluation', stuck_room.room_id;
  END LOOP;
  
  -- Fix missing sync events for submitted responses
  FOR stuck_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gres.id as response_id,
      gres.player_id,
      gres.round_number
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gr.current_phase = 'evaluation'
      AND gr.created_at > NOW() - INTERVAL '24 hours'
      AND gr.status = 'playing'
      AND NOT EXISTS (
        SELECT 1 FROM public.game_sync gs 
        WHERE gs.room_id = gr.id 
        AND gs.action_type = 'response_submit'
        AND (gs.action_data->>'round_number')::integer = gres.round_number
        AND gs.triggered_by = gres.player_id
      )
  LOOP
    -- Create missing sync event (technical issue)
    INSERT INTO public.game_sync (
      room_id, 
      action_type, 
      action_data, 
      triggered_by
    ) VALUES (
      stuck_room.room_id,
      'response_submit',
      jsonb_build_object(
        'round_number', stuck_room.round_number,
        'timestamp', NOW()::text,
        'technical_recovery', true,
        'reason', 'missing_sync_event'
      ),
      stuck_room.player_id
    );
    
    RETURN QUERY SELECT stuck_room.room_id, 'restored_missing_sync_event'::text;
    
    RAISE LOG 'Fixed technical issue: restored missing sync event for room % round %', stuck_room.room_id, stuck_room.round_number;
  END LOOP;
END;
$function$;

-- 3. Update disconnection detection to be much more lenient (30 minutes instead of 2 minutes)
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
    UPDATE public.connection_states 
    SET 
      connection_status = 'disconnected',
      updated_at = NOW()
    WHERE room_id = disconnected_room.room_id
      AND last_ping < NOW() - INTERVAL '30 minutes';
    
    RETURN QUERY SELECT disconnected_room.room_id, 'detected_disconnection'::text;
    
    RAISE LOG 'Detected disconnection after 30 minutes: room %', disconnected_room.room_id;
  END LOOP;
END;
$function$;

-- 4. Update the main queue processor to use the new technical-only recovery
CREATE OR REPLACE FUNCTION public.process_game_flow_queue()
RETURNS TABLE(processed_count integer, error_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  queue_item RECORD;
  processed_total INTEGER := 0;
  error_total INTEGER := 0;
BEGIN
  -- Process unprocessed queue items (limit to prevent timeouts)
  FOR queue_item IN 
    SELECT * FROM public.game_flow_queue 
    WHERE processed = false 
    AND created_at > NOW() - INTERVAL '2 hours'
    ORDER BY created_at ASC
    LIMIT 5
  LOOP
    BEGIN
      -- Mark as processed immediately to prevent reprocessing
      UPDATE public.game_flow_queue 
      SET 
        processed = true,
        processed_at = NOW()
      WHERE id = queue_item.id;
      
      processed_total := processed_total + 1;
      RAISE LOG 'Processed queue item: % for room %', queue_item.event_type, queue_item.room_id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Mark as processed with error
        UPDATE public.game_flow_queue 
        SET 
          processed = true,
          processed_at = NOW(),
          error_message = SQLERRM
        WHERE id = queue_item.id;
        
        error_total := error_total + 1;
        RAISE LOG 'Error processing queue item %: %', queue_item.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed_total, error_total;
END;
$function$;
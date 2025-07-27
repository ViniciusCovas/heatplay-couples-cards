-- Create automatic sync event trigger for game responses
CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL THEN
    -- Determine which player should evaluate (opposite of the one who responded)
    DECLARE
      evaluating_player text;
      room_current_turn text;
    BEGIN
      -- Get current turn from the room
      SELECT current_turn INTO room_current_turn 
      FROM game_rooms 
      WHERE id = NEW.room_id;
      
      -- Set evaluating player as the opposite of current responder
      evaluating_player := CASE 
        WHEN NEW.player_id LIKE '%player1%' OR room_current_turn = 'player1' THEN 'player2'
        ELSE 'player1'
      END;
      
      -- Insert the response_submit sync event
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'response_submit',
        jsonb_build_object(
          'question', (SELECT text FROM questions WHERE id::text = NEW.card_id),
          'response', NEW.response,
          'response_time', NEW.response_time,
          'evaluating_player', evaluating_player,
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event for room % player %', NEW.room_id, NEW.player_id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_response_sync ON public.game_responses;
CREATE TRIGGER trigger_auto_response_sync
  AFTER INSERT ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_response_sync_event();

-- Create a function to detect and repair stuck evaluation states
CREATE OR REPLACE FUNCTION public.repair_stuck_evaluations()
RETURNS TABLE(room_id uuid, action_taken text) AS $$
DECLARE
  stuck_room RECORD;
  missing_sync_count integer;
BEGIN
  -- Find rooms stuck in evaluation phase without proper sync events
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn,
      COUNT(DISTINCT gres.id) as response_count,
      COUNT(DISTINCT gs.id) as sync_count
    FROM game_rooms gr
    LEFT JOIN game_responses gres ON gr.id = gres.room_id 
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
    LEFT JOIN game_sync gs ON gr.id = gs.room_id 
      AND gs.action_type = 'response_submit'
    WHERE gr.current_phase = 'evaluation'
      AND gr.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY gr.id, gr.room_code, gr.current_phase, gr.current_turn
    HAVING COUNT(DISTINCT gres.id) > COUNT(DISTINCT gs.id)
  LOOP
    -- Create missing sync event for this stuck room
    INSERT INTO public.game_sync (
      room_id, 
      action_type, 
      action_data, 
      triggered_by
    ) 
    SELECT 
      stuck_room.room_id,
      'response_submit',
      jsonb_build_object(
        'question', q.text,
        'response', gres.response,
        'response_time', gres.response_time,
        'evaluating_player', stuck_room.current_turn,
        'round_number', gres.round_number,
        'timestamp', gres.created_at::text,
        'auto_repair', true
      ),
      gres.player_id
    FROM game_responses gres
    JOIN questions q ON q.id::text = gres.card_id
    WHERE gres.room_id = stuck_room.room_id
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM game_sync gs2 
        WHERE gs2.room_id = stuck_room.room_id 
        AND gs2.action_type = 'response_submit'
        AND gs2.created_at >= gres.created_at
      )
    ORDER BY gres.created_at DESC
    LIMIT 1;
    
    RETURN QUERY SELECT stuck_room.room_id, 'repaired_missing_sync_event'::text;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
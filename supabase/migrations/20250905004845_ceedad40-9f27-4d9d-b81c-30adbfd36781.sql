-- Fix duplicate sync events by improving the response submission trigger
CREATE OR REPLACE FUNCTION public.handle_response_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  evaluating_player text;
  responding_player text;
  responding_player_number integer;
  evaluating_player_number integer;
  question_text text;
  existing_sync_count integer;
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL AND (OLD.response IS NULL OR OLD.response IS DISTINCT FROM NEW.response) THEN
    
    -- Prevent duplicate sync events for the same response
    SELECT COUNT(*) INTO existing_sync_count
    FROM public.game_sync 
    WHERE room_id = NEW.room_id 
      AND action_type = 'response_submit'
      AND (action_data->>'round_number')::integer = NEW.round_number
      AND triggered_by = NEW.player_id;
    
    -- Only proceed if no sync event exists for this response
    IF existing_sync_count = 0 THEN
      -- Get the responding player's number from room_participants
      SELECT player_number INTO responding_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.player_id
      LIMIT 1;
      
      -- If we can't find the player number, log error and exit
      IF responding_player_number IS NULL THEN
        RAISE LOG 'Cannot find player_number for player_id % in room %', NEW.player_id, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Determine player roles and evaluating player number
      IF responding_player_number = 1 THEN
        responding_player := 'player1';
        evaluating_player := 'player2';
        evaluating_player_number := 2;
      ELSE
        responding_player := 'player2';
        evaluating_player := 'player1';
        evaluating_player_number := 1;
      END IF;
      
      -- Get question text
      SELECT text INTO question_text FROM public.questions WHERE id::text = NEW.card_id;
      
      -- Update game room to evaluation phase with correct turn
      UPDATE public.game_rooms 
      SET 
        current_phase = 'evaluation',
        current_turn = evaluating_player
      WHERE id = NEW.room_id;
      
      -- Insert the response_submit sync event (ONLY ONCE)
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'response_submit',
        jsonb_build_object(
          'question', COALESCE(question_text, 'Unknown question'),
          'response', NEW.response,
          'response_time', NEW.response_time,
          'evaluating_player', evaluating_player,
          'responding_player', responding_player,
          'evaluating_player_number', evaluating_player_number,
          'responding_player_number', responding_player_number,
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true,
          'player_name', NEW.player_id
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Response submitted: room %, player % (number %) -> evaluating player % (number %), phase=evaluation', 
        NEW.room_id, NEW.player_id, responding_player_number, evaluating_player, evaluating_player_number;
    ELSE
      RAISE LOG 'Skipped duplicate sync event for room % player % round %', NEW.room_id, NEW.player_id, NEW.round_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
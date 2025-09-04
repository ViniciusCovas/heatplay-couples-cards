-- Fix game loop issues and restore proper round advancement

-- 1. Drop existing problematic triggers
DROP TRIGGER IF EXISTS simple_evaluation_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS auto_create_response_sync_trigger ON public.game_responses;

-- 2. Create improved evaluation completion trigger
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  evaluating_player_number INTEGER;
  responding_player_number INTEGER;
  next_turn TEXT;
  next_player_number INTEGER;
  total_evaluations INTEGER;
  next_card_id TEXT;
  room_used_cards TEXT[];
  current_card_id TEXT;
  update_count INTEGER;
  room_record RECORD;
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    
    -- Get evaluating player number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;
    
    IF evaluating_player_number IS NULL THEN
      RAISE LOG 'ERROR: Cannot find evaluating player % in room %', NEW.evaluation_by, NEW.room_id;
      RETURN NEW;
    END IF;
    
    -- Get room details with row lock
    SELECT * INTO room_record
    FROM public.game_rooms 
    WHERE id = NEW.room_id
    FOR UPDATE;
    
    IF room_record IS NULL THEN
      RAISE LOG 'ERROR: Room % not found', NEW.room_id;
      RETURN NEW;
    END IF;
    
    -- Count total evaluations for this room
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;
    
    -- Determine next player (alternate between players)
    IF evaluating_player_number = 1 THEN
      next_turn := 'player2';
      next_player_number := 2;
    ELSE
      next_turn := 'player1';
      next_player_number := 1;
    END IF;
    
    RAISE LOG 'Processing evaluation: total_evaluations=%, next_turn=%, next_player=%', 
      total_evaluations, next_turn, next_player_number;
    
    -- Check if game should end (after 6+ rounds with evaluations)
    IF total_evaluations >= 6 THEN
      -- Game finished
      UPDATE public.game_rooms 
      SET 
        status = 'finished',
        current_phase = 'final-report',
        finished_at = NOW()
      WHERE id = NEW.room_id;
      
      -- Create sync event for game completion
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'game_finish',
        jsonb_build_object(
          'final_round', NEW.round_number,
          'total_evaluations', total_evaluations,
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
      RAISE LOG 'Game completed after % evaluations for room %', total_evaluations, NEW.room_id;
      
    ELSE
      -- Continue game - prepare next round
      
      -- Add current card to used_cards if not already there
      current_card_id := room_record.current_card;
      room_used_cards := COALESCE(room_record.used_cards, '{}');
      
      IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
        room_used_cards := array_append(room_used_cards, current_card_id);
      END IF;
      
      -- Select next card using existing robust function
      next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);
      
      -- Update room state atomically
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_turn,
        current_card = next_card_id,
        current_card_index = COALESCE(current_card_index, 0) + 1,
        used_cards = room_used_cards
      WHERE id = NEW.room_id;
      
      GET DIAGNOSTICS update_count = ROW_COUNT;
      
      IF update_count = 0 THEN
        RAISE LOG 'ERROR: Failed to update room % for next round', NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Create sync event for round advancement
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'evaluation_complete',
        jsonb_build_object(
          'evaluation', NEW.evaluation,
          'round_number', NEW.round_number,
          'next_turn', next_turn,
          'next_player_number', next_player_number,
          'next_card_id', next_card_id,
          'total_evaluations', total_evaluations,
          'game_finished', false,
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
      RAISE LOG 'Round advanced: room %, from round %, next turn %, next card %', 
        NEW.room_id, NEW.round_number, next_turn, next_card_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Create improved response submission trigger (no duplicates)
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
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL AND (OLD.response IS NULL OR OLD.response IS DISTINCT FROM NEW.response) THEN
    
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Create the triggers
CREATE TRIGGER evaluation_completion_trigger
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion_v2();

CREATE TRIGGER response_submission_trigger
  AFTER INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_response_submission();

-- 5. Optimize the queue processing function  
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
    AND created_at > NOW() - INTERVAL '2 hours'  -- Increased window
    ORDER BY created_at ASC
    LIMIT 5  -- Reduced limit for faster processing
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

-- 6. Add auto-recovery functions for stuck games
CREATE OR REPLACE FUNCTION public.auto_advance_stuck_evaluations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation phase for more than 10 minutes
  FOR stuck_room IN 
    SELECT DISTINCT
      gr.id as room_id,
      gr.current_phase,
      gr.updated_at
    FROM public.game_rooms gr
    WHERE gr.current_phase = 'evaluation'
      AND gr.status = 'playing'
      AND gr.updated_at < NOW() - INTERVAL '10 minutes'
      AND gr.created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Force advance stuck room by creating a system evaluation
    INSERT INTO public.game_responses (room_id, card_id, player_id, response, evaluation, evaluation_by, round_number)
    VALUES (
      stuck_room.room_id,
      'system-recovery',
      'system',
      'Auto-recovery',
      'Auto-advanced due to timeout',
      'system',
      1
    )
    ON CONFLICT DO NOTHING;
    
    RAISE LOG 'Auto-advanced stuck room: %', stuck_room.room_id;
  END LOOP;
END;
$function$;

-- 7. Detect disconnected players
CREATE OR REPLACE FUNCTION public.detect_disconnected_players()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update connection states for players who haven't pinged recently
  UPDATE public.connection_states 
  SET connection_status = 'disconnected'
  WHERE last_ping < NOW() - INTERVAL '30 seconds'
    AND connection_status = 'connected';
    
  RAISE LOG 'Updated disconnected player statuses';
END;
$function$;
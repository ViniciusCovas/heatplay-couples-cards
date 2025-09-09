-- Fix potential trigger conflicts and ensure evaluation completion works properly

-- First, check if there are any conflicts or issues with the current trigger
DROP TRIGGER IF EXISTS simple_evaluation_trigger_on_game_responses ON public.game_responses;

-- Recreate the evaluation completion trigger with enhanced logging
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v3()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  evaluating_player_number INTEGER;
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
    
    RAISE LOG 'EVALUATION TRIGGER FIRED: room_id=%, response_id=%, evaluation_by=%', 
      NEW.room_id, NEW.id, NEW.evaluation_by;
    
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
      
      RAISE LOG 'SYNC EVENT CREATED: evaluation_complete for room %, next_turn=%, next_card=%', 
        NEW.room_id, next_turn, next_card_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON public.game_responses;

CREATE TRIGGER evaluation_completion_trigger_v3
AFTER UPDATE ON public.game_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_evaluation_completion_v3();
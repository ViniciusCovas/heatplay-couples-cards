-- Clean up database triggers to fix evaluation flow issues
-- Drop all legacy triggers on game_responses that may conflict
DROP TRIGGER IF EXISTS trg_handle_evaluation_completion_v2 ON public.game_responses;
DROP TRIGGER IF EXISTS trg_handle_evaluation_completion_v3 ON public.game_responses;
DROP TRIGGER IF EXISTS trg_simple_evaluation_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS simple_evaluation_trigger ON public.game_responses;

-- Drop queue-related triggers that interfere
DROP TRIGGER IF EXISTS evaluation_queue_trigger ON public.game_responses;

-- Keep only the correct triggers:
-- 1. handle_response_submission_v2 (AFTER INSERT) - already exists
-- 2. handle_evaluation_completion_v4 (AFTER UPDATE) - ensure it exists

-- Ensure the v4 trigger exists and is correct
DROP TRIGGER IF EXISTS trg_handle_evaluation_completion_v4 ON public.game_responses;
CREATE TRIGGER trg_handle_evaluation_completion_v4
AFTER UPDATE ON public.game_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_evaluation_completion_v4();

-- Add defensive fallback to handle_evaluation_completion_v4 for missing sub_turn
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v4()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
  current_sub_turn TEXT;
  first_responder TEXT;
  completion_status TEXT;
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    
    RAISE LOG 'EVALUATION TRIGGER V4 FIRED: room_id=%, response_id=%, evaluation_by=%', 
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
    
    -- Get current sub-turn state with defensive fallback
    current_sub_turn := COALESCE(room_record.question_sub_turn, 'first_evaluation');
    first_responder := room_record.question_first_responder;
    completion_status := COALESCE(room_record.question_completion_status, 'incomplete');
    
    -- Defensive inference: if sub_turn is unexpected, infer from context
    IF current_sub_turn NOT IN ('first_evaluation', 'second_evaluation') THEN
      -- Count evaluations for current card to infer state
      SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
      INTO total_evaluations
      FROM public.game_responses 
      WHERE room_id = NEW.room_id 
      AND card_id = room_record.current_card;
      
      IF total_evaluations <= 1 THEN
        current_sub_turn := 'first_evaluation';
      ELSE
        current_sub_turn := 'second_evaluation';
      END IF;
      
      RAISE LOG 'Inferred sub_turn=% from evaluation count=%', current_sub_turn, total_evaluations;
    END IF;
    
    -- Count total evaluations for this room
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;
    
    RAISE LOG 'Processing evaluation: total_evaluations=%, current_sub_turn=%, first_responder=%', 
      total_evaluations, current_sub_turn, first_responder;
    
    -- Check if game should end (after 12+ evaluations = 6 questions × 2 evaluations each)
    IF total_evaluations >= 12 THEN
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
      -- Continue game - handle sub-turn progression
      
      -- Determine next state based on current sub-turn
      IF current_sub_turn = 'first_evaluation' THEN
        -- After first evaluation, same question but second player responds
        IF evaluating_player_number = 1 THEN
          next_turn := 'player2';
          next_player_number := 2;
        ELSE
          next_turn := 'player1';
          next_player_number := 1;
        END IF;
        
        -- Update room state for second response to same question
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          question_sub_turn = 'second_response',
          question_completion_status = 'first_complete'
        WHERE id = NEW.room_id;
        
        -- Create sync event for second response phase
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
            'sub_turn', 'second_response',
            'same_question', true,
            'current_card_id', room_record.current_card,
            'total_evaluations', total_evaluations,
            'game_finished', false,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Sub-turn advanced: room %, second response phase, next turn %, same card %', 
          NEW.room_id, next_turn, room_record.current_card;
        
      ELSIF current_sub_turn = 'second_evaluation' THEN
        -- After second evaluation, advance to next question
        
        -- Determine who goes first on next question (alternate from current first responder)
        IF first_responder = 'player1' THEN
          next_turn := 'player2';
          next_player_number := 2;
        ELSE
          next_turn := 'player1';
          next_player_number := 1;
        END IF;
        
        -- Add current card to used_cards if not already there
        current_card_id := room_record.current_card;
        room_used_cards := COALESCE(room_record.used_cards, '{}');
        
        IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
          room_used_cards := array_append(room_used_cards, current_card_id);
        END IF;
        
        -- Select next card using existing robust function
        next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);
        
        -- Update room state for next question
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          current_card = next_card_id,
          current_card_index = COALESCE(current_card_index, 0) + 1,
          used_cards = room_used_cards,
          question_sub_turn = 'first_response',
          question_first_responder = next_turn,
          question_completion_status = 'incomplete'
        WHERE id = NEW.room_id;
        
        -- Create sync event for next question
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
            'sub_turn', 'first_response',
            'new_question', true,
            'total_evaluations', total_evaluations,
            'game_finished', false,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Question completed: room %, advancing to next card %, next turn %', 
          NEW.room_id, next_card_id, next_turn;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
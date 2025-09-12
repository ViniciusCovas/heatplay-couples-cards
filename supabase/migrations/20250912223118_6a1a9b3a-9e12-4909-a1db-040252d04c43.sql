-- Drop legacy evaluation triggers if they exist to avoid conflicting logic
DROP TRIGGER IF EXISTS handle_evaluation_completion_v4_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS handle_evaluation_completion_v3_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS handle_evaluation_completion_v2_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS simple_evaluation_trigger_on_game_responses ON public.game_responses;

-- New evaluation completion handler: ALWAYS advance to a NEW card and set NEXT TURN to the EVALUATOR
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v5()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  evaluating_player_number INTEGER;
  next_turn TEXT;
  next_player_number INTEGER;
  total_evaluations INTEGER;
  current_card_id TEXT;
  room_used_cards TEXT[];
  next_card_id TEXT;
  room_record RECORD;
  update_count INTEGER;
BEGIN
  -- Only handle when evaluation was newly added/changed
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    -- Find evaluator's player number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;

    IF evaluating_player_number IS NULL THEN
      RAISE LOG 'V5: evaluator not found: % in room %', NEW.evaluation_by, NEW.room_id;
      RETURN NEW;
    END IF;

    -- Next responder is the evaluator
    IF evaluating_player_number = 1 THEN
      next_turn := 'player1';
      next_player_number := 1;
    ELSE
      next_turn := 'player2';
      next_player_number := 2;
    END IF;

    -- Count total evaluations in this room
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;

    -- Finish game after 6 evaluations
    IF total_evaluations >= 6 THEN
      UPDATE public.game_rooms 
      SET 
        status = 'finished',
        current_phase = 'final-report',
        finished_at = now()
      WHERE id = NEW.room_id;

      INSERT INTO public.game_sync (room_id, action_type, action_data, triggered_by)
      VALUES (
        NEW.room_id,
        'game_finish',
        jsonb_build_object(
          'final_round', NEW.round_number,
          'total_evaluations', total_evaluations,
          'timestamp', now()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );

      RETURN NEW;
    END IF;

    -- Lock room and read state
    SELECT * INTO room_record
    FROM public.game_rooms 
    WHERE id = NEW.room_id
    FOR UPDATE;

    IF room_record IS NULL THEN
      RAISE LOG 'V5: room not found: %', NEW.room_id;
      RETURN NEW;
    END IF;

    current_card_id := room_record.current_card;
    room_used_cards := COALESCE(room_record.used_cards, ARRAY[]::text[]);

    -- Add current card to used_cards if missing
    IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
      room_used_cards := array_append(room_used_cards, current_card_id);
    END IF;

    -- Always select a NEW next card
    next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);

    -- Advance to next round with evaluator's turn
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

    GET DIAGNOSTICS update_count = ROW_COUNT;
    IF update_count = 0 THEN
      RAISE LOG 'V5: failed to update room %', NEW.room_id;
      RETURN NEW;
    END IF;

    -- Emit sync event to both players
    INSERT INTO public.game_sync (room_id, action_type, action_data, triggered_by)
    VALUES (
      NEW.room_id,
      'evaluation_complete',
      jsonb_build_object(
        'evaluation', NEW.evaluation,
        'round_number', NEW.round_number,
        'next_turn', next_turn,
        'next_player_number', next_player_number,
        'next_card_id', next_card_id,
        'new_question', true,
        'total_evaluations', total_evaluations,
        'game_finished', false,
        'timestamp', now()::text,
        'auto_generated', true
      ),
      NEW.evaluation_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the new trigger (idempotent: drop first just in case)
DROP TRIGGER IF EXISTS handle_evaluation_completion_v5_trigger ON public.game_responses;
CREATE TRIGGER handle_evaluation_completion_v5_trigger
AFTER UPDATE OF evaluation ON public.game_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_evaluation_completion_v5();
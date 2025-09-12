-- 1) Drop any existing evaluation triggers on game_responses that conflict (v2/v3/v4/simple)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'game_responses'
      AND t.tgisinternal = false
      AND p.proname IN (
        'handle_evaluation_completion_v2',
        'handle_evaluation_completion_v3',
        'handle_evaluation_completion_v4',
        'simple_evaluation_trigger'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.game_responses;', r.tgname);
  END LOOP;
END $$;

-- 2) Ensure we don't leave behind an older v5 trigger if it exists
DROP TRIGGER IF EXISTS trg_handle_evaluation_completion_v5 ON public.game_responses;

-- 3) Create a single, authoritative trigger function (v5)
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_v5()
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
  -- Only act when evaluation is added/changed from NULL
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    -- Identify evaluator player number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;

    IF evaluating_player_number IS NULL THEN
      RAISE LOG 'V5: Cannot find evaluating player % in room %', NEW.evaluation_by, NEW.room_id;
      RETURN NEW;
    END IF;

    -- Lock and read room
    SELECT * INTO room_record
    FROM public.game_rooms 
    WHERE id = NEW.room_id
    FOR UPDATE;

    IF room_record IS NULL THEN
      RAISE LOG 'V5: Room % not found', NEW.room_id;
      RETURN NEW;
    END IF;

    -- Count evaluations in this room
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;

    -- Next player's turn alternates from evaluator
    IF evaluating_player_number = 1 THEN
      next_turn := 'player2';
      next_player_number := 2;
    ELSE
      next_turn := 'player1';
      next_player_number := 1;
    END IF;

    -- Finish the game after 6 evaluations (6 questions)
    IF total_evaluations >= 6 THEN
      UPDATE public.game_rooms 
      SET 
        status = 'finished',
        current_phase = 'final-report',
        finished_at = NOW()
      WHERE id = NEW.room_id;

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

      RETURN NEW;
    END IF;

    -- Prepare next card
    current_card_id := room_record.current_card;
    room_used_cards := COALESCE(room_record.used_cards, '{}');

    IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
      room_used_cards := array_append(room_used_cards, current_card_id);
    END IF;

    next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);

    -- Advance both clients to next card immediately
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
      RAISE LOG 'V5: Failed to update room % for next round', NEW.room_id;
      RETURN NEW;
    END IF;

    -- Broadcast sync event for UI
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
        'new_question', true,
        'total_evaluations', total_evaluations,
        'game_finished', false,
        'timestamp', NOW()::text,
        'auto_generated', true
      ),
      NEW.evaluation_by
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Attach the v5 trigger to game_responses
CREATE TRIGGER trg_handle_evaluation_completion_v5
AFTER UPDATE OF evaluation ON public.game_responses
FOR EACH ROW
WHEN (NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation))
EXECUTE FUNCTION public.handle_evaluation_completion_v5();

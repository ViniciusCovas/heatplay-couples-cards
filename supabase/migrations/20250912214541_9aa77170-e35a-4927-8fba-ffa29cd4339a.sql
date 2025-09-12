-- Ensure correct alternating flow on response submission
-- 1) Create function to handle response submission and advance to evaluation for the correct player
CREATE OR REPLACE FUNCTION public.handle_response_submission_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  respondent_player_number INTEGER;
  evaluator_turn TEXT;
  respondent_turn TEXT;
  room_record RECORD;
BEGIN
  -- Only act when an actual response text exists
  IF NEW.response IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock room row to prevent race conditions
  SELECT * INTO room_record
  FROM public.game_rooms
  WHERE id = NEW.room_id
  FOR UPDATE;

  IF room_record IS NULL THEN
    RAISE LOG 'handle_response_submission_v2: room not found %', NEW.room_id;
    RETURN NEW;
  END IF;

  -- Get respondent player number
  SELECT player_number INTO respondent_player_number
  FROM public.room_participants
  WHERE room_id = NEW.room_id AND player_id = NEW.player_id
  LIMIT 1;

  IF respondent_player_number IS NULL THEN
    RAISE LOG 'handle_response_submission_v2: respondent % not a participant in room %', NEW.player_id, NEW.room_id;
    RETURN NEW;
  END IF;

  -- Determine textual turn labels
  IF respondent_player_number = 1 THEN
    respondent_turn := 'player1';
    evaluator_turn := 'player2';
  ELSE
    respondent_turn := 'player2';
    evaluator_turn := 'player1';
  END IF;

  -- Branch by current question sub-turn
  IF room_record.question_sub_turn IS NULL OR room_record.question_sub_turn = 'first_response' THEN
    -- First response submitted -> move to first_evaluation by the other player
    UPDATE public.game_rooms
    SET
      current_phase = 'evaluation',
      current_turn = evaluator_turn,
      question_sub_turn = 'first_evaluation',
      -- Set first responder if it's not set yet
      question_first_responder = COALESCE(room_record.question_first_responder, respondent_turn),
      question_completion_status = 'incomplete'
    WHERE id = NEW.room_id;

    -- Create sync event for response submission
    INSERT INTO public.game_sync (room_id, action_type, action_data, triggered_by)
    VALUES (
      NEW.room_id,
      'response_submit',
      jsonb_build_object(
        'sub_turn', 'first_response',
        'round_number', NEW.round_number,
        'respondent', respondent_turn,
        'evaluator_turn', evaluator_turn,
        'card_id', NEW.card_id,
        'timestamp', NOW()::text
      ),
      NEW.player_id
    );

    RAISE LOG 'handle_response_submission_v2: room %, moved to first_evaluation, evaluator %', NEW.room_id, evaluator_turn;

  ELSIF room_record.question_sub_turn = 'second_response' THEN
    -- Second response submitted -> move to second_evaluation by the other player
    UPDATE public.game_rooms
    SET
      current_phase = 'evaluation',
      current_turn = evaluator_turn,
      question_sub_turn = 'second_evaluation',
      question_completion_status = 'first_complete'
    WHERE id = NEW.room_id;

    -- Create sync event for second response submission
    INSERT INTO public.game_sync (room_id, action_type, action_data, triggered_by)
    VALUES (
      NEW.room_id,
      'response_submit',
      jsonb_build_object(
        'sub_turn', 'second_response',
        'round_number', NEW.round_number,
        'respondent', respondent_turn,
        'evaluator_turn', evaluator_turn,
        'card_id', NEW.card_id,
        'timestamp', NOW()::text
      ),
      NEW.player_id
    );

    RAISE LOG 'handle_response_submission_v2: room %, moved to second_evaluation, evaluator %', NEW.room_id, evaluator_turn;

  ELSE
    -- For any other sub-turns, do not change state here
    RAISE LOG 'handle_response_submission_v2: room %, no state change for sub_turn %', NEW.room_id, room_record.question_sub_turn;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Attach trigger to game_responses inserts
DROP TRIGGER IF EXISTS trg_handle_response_submission_v2 ON public.game_responses;
CREATE TRIGGER trg_handle_response_submission_v2
AFTER INSERT ON public.game_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_response_submission_v2();

-- Notes:
-- - After first_evaluation is submitted, handle_evaluation_completion_v4 moves to second_response (same card)
-- - After second_evaluation is submitted, handle_evaluation_completion_v4 advances to next question/card

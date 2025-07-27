-- Comprehensive fix for game state issues

-- 1. Fix data consistency in game_rooms table
-- Update current_card to use UUIDs instead of question text
UPDATE public.game_rooms 
SET current_card = (
  SELECT id::text 
  FROM public.questions 
  WHERE text = game_rooms.current_card 
  LIMIT 1
)
WHERE current_card IS NOT NULL 
  AND current_card !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 2. Fix card_id consistency in game_responses
UPDATE public.game_responses 
SET card_id = (
  SELECT id::text 
  FROM public.questions 
  WHERE text = game_responses.card_id 
  LIMIT 1
)
WHERE card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 3. Fix used_cards array to contain only UUIDs
UPDATE public.game_rooms 
SET used_cards = (
  SELECT array_agg(DISTINCT q.id::text)
  FROM unnest(used_cards) AS card_item
  JOIN public.questions q ON q.text = card_item OR q.id::text = card_item
  WHERE q.id IS NOT NULL
)
WHERE used_cards IS NOT NULL AND array_length(used_cards, 1) > 0;

-- 4. Add constraints for data integrity
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_current_card_uuid 
CHECK (current_card IS NULL OR current_card ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

ALTER TABLE public.game_responses 
ADD CONSTRAINT check_card_id_uuid 
CHECK (card_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- 5. Add constraint to prevent self-evaluation
ALTER TABLE public.game_responses 
ADD CONSTRAINT check_no_self_evaluation 
CHECK (evaluation_by IS NULL OR evaluation_by != player_id);

-- 6. Add constraint for valid turn values
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_valid_turn 
CHECK (current_turn IN ('player1', 'player2'));

-- 7. Add constraint for valid phase values
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_valid_phase 
CHECK (current_phase IN ('proximity-selection', 'level-selection', 'waiting', 'card-display', 'response-input', 'evaluation', 'final-report'));

-- 8. Clean up duplicate sync events
DELETE FROM public.game_sync a
WHERE EXISTS (
  SELECT 1 FROM public.game_sync b 
  WHERE a.room_id = b.room_id 
    AND a.action_type = b.action_type 
    AND a.created_at > b.created_at
    AND abs(extract(epoch from (a.created_at - b.created_at))) < 5
);

-- 9. Fix evaluation phase rooms with incorrect turn setup
UPDATE public.game_rooms 
SET current_turn = CASE 
  WHEN current_turn = 'player1' THEN 'player2'
  WHEN current_turn = 'player2' THEN 'player1'
  ELSE current_turn
END
WHERE current_phase = 'evaluation'
  AND id IN (
    SELECT DISTINCT gr.id 
    FROM game_rooms gr
    JOIN game_responses gres ON gr.id = gres.room_id
    WHERE gr.current_phase = 'evaluation'
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gres.player_id LIKE '%' || gr.current_turn || '%'
  );

-- 10. Create function to validate game state consistency
CREATE OR REPLACE FUNCTION validate_game_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure card references are UUIDs
  IF NEW.current_card IS NOT NULL AND NEW.current_card !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'current_card must be a valid UUID, got: %', NEW.current_card;
  END IF;
  
  -- Ensure proper turn alternation in evaluation phase
  IF NEW.current_phase = 'evaluation' THEN
    -- Check if there's a response without evaluation
    IF EXISTS (
      SELECT 1 FROM game_responses 
      WHERE room_id = NEW.id 
        AND response IS NOT NULL 
        AND evaluation IS NULL
        AND player_id LIKE '%' || NEW.current_turn || '%'
    ) THEN
      RAISE EXCEPTION 'Player cannot evaluate their own response. Current turn: %, but response exists for same player.', NEW.current_turn;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for game state validation
DROP TRIGGER IF EXISTS validate_game_state_trigger ON public.game_rooms;
CREATE TRIGGER validate_game_state_trigger
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION validate_game_state();

-- 12. Create function to ensure proper response/evaluation pairing
CREATE OR REPLACE FUNCTION validate_response_evaluation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-evaluation
  IF NEW.evaluation IS NOT NULL AND NEW.evaluation_by = NEW.player_id THEN
    RAISE EXCEPTION 'Player cannot evaluate their own response';
  END IF;
  
  -- Ensure card_id is a valid UUID
  IF NEW.card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'card_id must be a valid UUID, got: %', NEW.card_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for response validation
DROP TRIGGER IF EXISTS validate_response_evaluation_trigger ON public.game_responses;
CREATE TRIGGER validate_response_evaluation_trigger
  BEFORE INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION validate_response_evaluation();
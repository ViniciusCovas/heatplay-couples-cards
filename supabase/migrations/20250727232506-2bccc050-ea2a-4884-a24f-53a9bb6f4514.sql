-- Add validation triggers and functions

-- 1. Create function to validate game state consistency
CREATE OR REPLACE FUNCTION validate_game_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure card references are UUIDs
  IF NEW.current_card IS NOT NULL AND NEW.current_card !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'current_card must be a valid UUID, got: %', NEW.current_card;
  END IF;
  
  -- Ensure proper turn alternation in evaluation phase
  IF NEW.current_phase = 'evaluation' THEN
    -- Check if there's a response without evaluation from the same player
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

-- 2. Create trigger for game state validation
DROP TRIGGER IF EXISTS validate_game_state_trigger ON public.game_rooms;
CREATE TRIGGER validate_game_state_trigger
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION validate_game_state();

-- 3. Create function to ensure proper response/evaluation pairing
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

-- 4. Create trigger for response validation
DROP TRIGGER IF EXISTS validate_response_evaluation_trigger ON public.game_responses;
CREATE TRIGGER validate_response_evaluation_trigger
  BEFORE INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION validate_response_evaluation();
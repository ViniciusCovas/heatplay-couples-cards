-- Fix player evaluation logic by properly mapping player IDs to player numbers

-- Step 1: Update auto_create_response_sync_event to use room_participants table for proper player mapping
CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL THEN
    DECLARE
      evaluating_player text;
      responding_player text;
      responding_player_number integer;
      evaluating_player_number integer;
    BEGIN
      -- Get the responding player's number from room_participants
      SELECT player_number INTO responding_player_number
      FROM room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.player_id
      LIMIT 1;
      
      -- If we can't find the player number, log error and exit
      IF responding_player_number IS NULL THEN
        RAISE LOG 'Cannot find player_number for player_id % in room %', NEW.player_id, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Determine evaluating player (opposite of responding player)
      IF responding_player_number = 1 THEN
        responding_player := 'player1';
        evaluating_player := 'player2';
        evaluating_player_number := 2;
      ELSE
        responding_player := 'player2';
        evaluating_player := 'player1';
        evaluating_player_number := 1;
      END IF;
      
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
          'responding_player', responding_player,
          'evaluating_player_number', evaluating_player_number,
          'responding_player_number', responding_player_number,
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event for room % - responding player % (number %) -> evaluating player % (number %)', 
        NEW.room_id, NEW.player_id, responding_player_number, evaluating_player, evaluating_player_number;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger for the function if it doesn't exist
DROP TRIGGER IF EXISTS auto_response_sync_trigger ON game_responses;
CREATE TRIGGER auto_response_sync_trigger
  AFTER INSERT OR UPDATE ON game_responses
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_response_sync_event();

-- Step 3: Clean up stuck rooms and reset evaluation phases (using created_at since updated_at doesn't exist)
UPDATE game_rooms 
SET current_phase = 'card-display', 
    current_turn = 'player1'
WHERE current_phase = 'evaluation' 
  AND created_at < now() - INTERVAL '10 minutes';

-- Step 4: Clean up incomplete sync events for stuck evaluations  
DELETE FROM game_sync 
WHERE action_type = 'response_submit' 
  AND created_at < now() - INTERVAL '10 minutes'
  AND room_id IN (
    SELECT id FROM game_rooms 
    WHERE current_phase = 'evaluation' 
    AND created_at < now() - INTERVAL '10 minutes'
  );

-- Step 5: Fix any game_responses with invalid card_id references
UPDATE game_responses 
SET card_id = (
  SELECT id::text 
  FROM questions 
  WHERE text = game_responses.card_id 
  LIMIT 1
)
WHERE card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND EXISTS (
    SELECT 1 FROM questions WHERE text = game_responses.card_id
  );

-- Step 6: Add helper function to get player number from player_id
CREATE OR REPLACE FUNCTION public.get_player_number(room_id_param uuid, player_id_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  player_num integer;
BEGIN
  SELECT player_number INTO player_num
  FROM room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param
  LIMIT 1;
  
  RETURN COALESCE(player_num, 0);
END;
$$;
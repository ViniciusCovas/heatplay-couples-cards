-- Update the auto-create response sync event function to ensure proper turn management

CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL THEN
    -- Determine which player should evaluate (opposite of the one who responded)
    DECLARE
      evaluating_player text;
      responding_player text;
    BEGIN
      -- Extract player number from player_id (assumes format like "player_xxxxx_player1")
      IF NEW.player_id LIKE '%player1%' THEN
        responding_player := 'player1';
        evaluating_player := 'player2';
      ELSE
        responding_player := 'player2';
        evaluating_player := 'player1';
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
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event for room % player % -> evaluating_player %', 
        NEW.room_id, NEW.player_id, evaluating_player;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
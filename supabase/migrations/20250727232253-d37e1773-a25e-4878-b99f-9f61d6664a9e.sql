-- Continue with constraints and validation

-- 6. Add constraints for data integrity
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_current_card_uuid 
CHECK (current_card IS NULL OR current_card ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

ALTER TABLE public.game_responses 
ADD CONSTRAINT check_card_id_uuid 
CHECK (card_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- 7. Add constraint to prevent self-evaluation
ALTER TABLE public.game_responses 
ADD CONSTRAINT check_no_self_evaluation 
CHECK (evaluation_by IS NULL OR evaluation_by != player_id);

-- 8. Add constraint for valid turn values
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_valid_turn 
CHECK (current_turn IN ('player1', 'player2'));

-- 9. Add constraint for valid phase values
ALTER TABLE public.game_rooms 
ADD CONSTRAINT check_valid_phase 
CHECK (current_phase IN ('proximity-selection', 'level-selection', 'waiting', 'card-display', 'response-input', 'evaluation', 'final-report'));

-- 10. Clean up duplicate sync events
DELETE FROM public.game_sync a
WHERE EXISTS (
  SELECT 1 FROM public.game_sync b 
  WHERE a.room_id = b.room_id 
    AND a.action_type = b.action_type 
    AND a.created_at > b.created_at
    AND abs(extract(epoch from (a.created_at - b.created_at))) < 5
);

-- 11. Fix evaluation phase rooms with incorrect turn setup
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
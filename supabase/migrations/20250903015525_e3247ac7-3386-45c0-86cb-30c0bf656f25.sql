-- Remove duplicate triggers and fix game flow
-- Drop duplicate triggers on game_responses table
DROP TRIGGER IF EXISTS handle_evaluation_completion_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS trigger_handle_evaluation_completion ON public.game_responses;

-- Recreate single trigger with proper naming
CREATE TRIGGER handle_evaluation_completion_trigger
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion();

-- Clean up any duplicate sync events from the last 24 hours
DELETE FROM public.game_sync 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY room_id, action_type, triggered_by, 
             (action_data->>'round_number')::integer
             ORDER BY created_at
           ) as rn
    FROM public.game_sync 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    AND action_type IN ('evaluation_complete', 'response_submit')
  ) t 
  WHERE rn > 1
);

-- Reset any rooms stuck in evaluation phase to card-display if they have completed evaluations
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = CASE 
    WHEN current_turn = 'player1' THEN 'player2'
    ELSE 'player1'
  END
WHERE current_phase = 'evaluation'
AND EXISTS (
  SELECT 1 FROM public.game_responses 
  WHERE game_responses.room_id = game_rooms.id 
  AND evaluation IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'
);
-- Remove the trigger that's interfering with normal operation
DROP TRIGGER IF EXISTS update_proximity_completion ON public.game_rooms;
DROP FUNCTION IF EXISTS public.check_proximity_completion();

-- Reset the stuck room to test
UPDATE public.game_rooms 
SET 
  player1_proximity_response = NULL,
  player2_proximity_response = NULL,
  proximity_question_answered = false,
  current_phase = 'proximity-selection'
WHERE room_code = 'J74XTQ';
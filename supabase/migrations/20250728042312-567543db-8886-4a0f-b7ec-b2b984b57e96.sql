-- Drop the existing trigger and recreate it with better logic
DROP TRIGGER IF EXISTS update_proximity_completion ON public.game_rooms;

-- Update the trigger function to properly handle the logic
CREATE OR REPLACE FUNCTION public.check_proximity_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only check and update if we're in proximity-selection phase
  IF NEW.current_phase = 'proximity-selection' THEN
    -- Set proximity_question_answered to true when both players have responded
    IF NEW.player1_proximity_response IS NOT NULL AND NEW.player2_proximity_response IS NOT NULL THEN
      NEW.proximity_question_answered = true;
      NEW.current_phase = 'level-select';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER update_proximity_completion
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_proximity_completion();

-- Fix the current stuck room
UPDATE public.game_rooms 
SET 
  player1_proximity_response = NULL,
  player2_proximity_response = NULL,
  proximity_question_answered = false,
  current_phase = 'proximity-selection'
WHERE room_code = 'J74XTQ';
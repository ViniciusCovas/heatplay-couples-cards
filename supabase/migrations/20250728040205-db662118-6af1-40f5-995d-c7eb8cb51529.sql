-- Add individual player proximity response tracking
ALTER TABLE public.game_rooms 
ADD COLUMN player1_proximity_response boolean DEFAULT NULL,
ADD COLUMN player2_proximity_response boolean DEFAULT NULL;

-- Create function to check if both players have answered
CREATE OR REPLACE FUNCTION public.check_proximity_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set proximity_question_answered to true when both players have responded
  IF NEW.player1_proximity_response IS NOT NULL AND NEW.player2_proximity_response IS NOT NULL THEN
    NEW.proximity_question_answered = true;
    NEW.current_phase = 'level-select';
  ELSE
    NEW.proximity_question_answered = false;
  END IF;
  
  RETURN NEW;
END;
$function$

-- Create trigger to automatically update proximity_question_answered
CREATE TRIGGER update_proximity_completion
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_proximity_completion();
-- Fix search path security issue for the new function
CREATE OR REPLACE FUNCTION public.check_proximity_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$function$;
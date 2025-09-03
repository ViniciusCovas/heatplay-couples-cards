-- Install the missing trigger that queues evaluation completion events
CREATE TRIGGER simple_evaluation_trigger_on_game_responses
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_evaluation_trigger();
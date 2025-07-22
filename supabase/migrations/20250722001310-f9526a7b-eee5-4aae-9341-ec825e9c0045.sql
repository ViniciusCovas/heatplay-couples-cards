
-- Update the selection_method constraint to allow all AI selection methods
ALTER TABLE public.game_responses 
DROP CONSTRAINT IF EXISTS game_responses_selection_method_check;

ALTER TABLE public.game_responses 
ADD CONSTRAINT game_responses_selection_method_check 
CHECK (selection_method IN ('random', 'ai_intelligent', 'smart_random_fallback', 'deterministic'));

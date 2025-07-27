-- Add check constraint to prevent empty card_id in game_responses
ALTER TABLE public.game_responses 
ADD CONSTRAINT check_card_id_not_empty 
CHECK (card_id IS NOT NULL AND card_id != '');

-- Add AI metadata columns to game_rooms table for syncing AI card information between players
ALTER TABLE public.game_rooms 
ADD COLUMN current_card_ai_reasoning text,
ADD COLUMN current_card_ai_target_area text,
ADD COLUMN current_card_selection_method text DEFAULT 'random';

-- Add comment for documentation
COMMENT ON COLUMN public.game_rooms.current_card_ai_reasoning IS 'AI reasoning for current card selection';
COMMENT ON COLUMN public.game_rooms.current_card_ai_target_area IS 'Target relationship area (honesty, attraction, intimacy, surprise)';
COMMENT ON COLUMN public.game_rooms.current_card_selection_method IS 'Method used to select card (ai_intelligent, random)';

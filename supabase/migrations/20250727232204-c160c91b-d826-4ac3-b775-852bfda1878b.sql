-- Fix for comprehensive game state issues (step by step approach)

-- 1. First, handle null card_id values in game_responses
-- Delete responses with null card_id as they are invalid
DELETE FROM public.game_responses 
WHERE card_id IS NULL OR card_id = '';

-- 2. Fix data consistency in game_rooms table
-- Update current_card to use UUIDs instead of question text
UPDATE public.game_rooms 
SET current_card = (
  SELECT id::text 
  FROM public.questions 
  WHERE text = game_rooms.current_card 
  LIMIT 1
)
WHERE current_card IS NOT NULL 
  AND current_card !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 3. Fix card_id consistency in game_responses
UPDATE public.game_responses 
SET card_id = (
  SELECT id::text 
  FROM public.questions 
  WHERE text = game_responses.card_id 
  LIMIT 1
)
WHERE card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.questions WHERE text = game_responses.card_id
  );

-- 4. Delete game_responses that can't be matched to valid questions
DELETE FROM public.game_responses 
WHERE card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions WHERE text = game_responses.card_id
  );

-- 5. Fix used_cards array to contain only UUIDs
UPDATE public.game_rooms 
SET used_cards = (
  SELECT COALESCE(array_agg(DISTINCT q.id::text), ARRAY[]::text[])
  FROM unnest(used_cards) AS card_item
  JOIN public.questions q ON q.text = card_item OR q.id::text = card_item
  WHERE q.id IS NOT NULL
)
WHERE used_cards IS NOT NULL AND array_length(used_cards, 1) > 0;
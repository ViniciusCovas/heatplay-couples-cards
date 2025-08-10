-- Add foreign key constraint between game_responses.card_id and questions.id
-- This will allow proper joins in Supabase queries

-- First, ensure card_id values are valid UUIDs and reference existing questions
-- Clean up any invalid card_id references
UPDATE game_responses 
SET card_id = (
  SELECT id::text FROM questions 
  WHERE text = card_id 
  LIMIT 1
)
WHERE card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- Add the foreign key constraint
ALTER TABLE game_responses 
ADD CONSTRAINT fk_game_responses_card_id 
FOREIGN KEY (card_id) 
REFERENCES questions(id);
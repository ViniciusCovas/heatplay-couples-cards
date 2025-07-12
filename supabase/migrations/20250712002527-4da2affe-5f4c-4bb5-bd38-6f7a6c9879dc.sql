-- Fix the created_by field type mismatch
-- Change created_by from UUID to TEXT to match the player_id format
ALTER TABLE public.game_rooms 
ALTER COLUMN created_by TYPE TEXT;
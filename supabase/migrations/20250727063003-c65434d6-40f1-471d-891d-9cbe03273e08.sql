-- Phase 1: Add selected_language column to game_rooms table
ALTER TABLE public.game_rooms 
ADD COLUMN selected_language VARCHAR(2) DEFAULT 'es';

-- Update existing rooms to have the default language
UPDATE public.game_rooms 
SET selected_language = 'es' 
WHERE selected_language IS NULL;

-- Phase 2: Fix Spanish questions that are incorrectly marked as other languages
-- First, identify Spanish questions (those starting with ¿ or common Spanish words)
UPDATE public.questions 
SET language = 'es' 
WHERE (text ILIKE '¿%' OR 
       text ILIKE '%qué%' OR 
       text ILIKE '%cómo%' OR 
       text ILIKE '%cuál%' OR 
       text ILIKE '%cuándo%' OR 
       text ILIKE '%dónde%' OR 
       text ILIKE '%por qué%' OR 
       text ILIKE '%contigo%' OR 
       text ILIKE '%conmigo%' OR 
       text ILIKE '%sientes%' OR 
       text ILIKE '%recuerdo%' OR 
       text ILIKE '%miedo%' OR 
       text ILIKE '%vulnerable%' OR 
       text ILIKE '%momentos%' OR 
       text ILIKE '%año%' OR 
       text ILIKE '%más%' OR 
       text ILIKE '%dirías%' OR 
       text ILIKE '%compartes%' OR 
       text ILIKE '%feliz%')
AND language != 'es';

-- Remove duplicate Spanish questions that were created in other language tables
DELETE FROM public.questions 
WHERE id IN (
  SELECT DISTINCT q1.id
  FROM public.questions q1
  JOIN public.questions q2 ON q1.text = q2.text 
  WHERE q1.language != 'es' 
  AND q2.language = 'es'
  AND q1.id != q2.id
  AND (q1.text ILIKE '¿%' OR 
       q1.text ILIKE '%qué%' OR 
       q1.text ILIKE '%cómo%' OR 
       q1.text ILIKE '%cuál%')
);

-- Phase 3: Clean up used_cards that contain corrupted data
UPDATE public.game_rooms 
SET used_cards = '{}' 
WHERE array_length(used_cards, 1) > 0 
AND EXISTS (
  SELECT 1 FROM unnest(used_cards) AS card_text 
  WHERE length(card_text) > 200 OR card_text ILIKE '¿%'
);
-- Migration to fix used_cards system: convert from text to question IDs
-- and add question ID tracking capabilities

-- Create a helper function to find question IDs from text
CREATE OR REPLACE FUNCTION public.get_question_id_from_text(question_text text, room_language text DEFAULT 'es')
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  question_id uuid;
BEGIN
  -- Try to find the question by exact text match and language
  SELECT id INTO question_id 
  FROM public.questions 
  WHERE text = question_text 
    AND language = room_language 
    AND is_active = true
  LIMIT 1;
  
  -- If not found in the specified language, try any language
  IF question_id IS NULL THEN
    SELECT id INTO question_id 
    FROM public.questions 
    WHERE text = question_text 
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN question_id;
END;
$function$;

-- Create function to convert text-based used_cards to ID-based
CREATE OR REPLACE FUNCTION public.convert_used_cards_to_ids()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  room_record RECORD;
  card_text text;
  question_id uuid;
  new_used_card_ids uuid[] := '{}';
BEGIN
  -- Process each room that has text-based used_cards
  FOR room_record IN 
    SELECT id, used_cards, selected_language
    FROM public.game_rooms 
    WHERE array_length(used_cards, 1) > 0
  LOOP
    new_used_card_ids := '{}';
    
    -- Convert each text card to question ID
    FOREACH card_text IN ARRAY room_record.used_cards
    LOOP
      question_id := get_question_id_from_text(card_text, COALESCE(room_record.selected_language, 'es'));
      
      -- Only add if we found a valid ID and it's not already in the array
      IF question_id IS NOT NULL AND NOT (question_id = ANY(new_used_card_ids)) THEN
        new_used_card_ids := array_append(new_used_card_ids, question_id::text);
      END IF;
    END LOOP;
    
    -- Update the room with the new ID-based used_cards
    UPDATE public.game_rooms 
    SET used_cards = new_used_card_ids
    WHERE id = room_record.id;
    
    RAISE NOTICE 'Converted room % from % text cards to % ID cards', 
      room_record.id, 
      array_length(room_record.used_cards, 1), 
      array_length(new_used_card_ids, 1);
  END LOOP;
END;
$function$;

-- Run the conversion for existing rooms
SELECT public.convert_used_cards_to_ids();

-- Add constraint to ensure used_cards contains only valid UUIDs
-- (This will help prevent future text storage)
CREATE OR REPLACE FUNCTION public.validate_used_cards_are_uuids()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  card_id text;
BEGIN
  -- Check each element in used_cards array
  FOREACH card_id IN ARRAY NEW.used_cards
  LOOP
    -- Try to cast to UUID - this will fail if it's not a valid UUID
    BEGIN
      PERFORM card_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'used_cards must contain only valid question UUIDs, got: %', card_id;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to validate used_cards on insert/update
DROP TRIGGER IF EXISTS validate_used_cards_trigger ON public.game_rooms;
CREATE TRIGGER validate_used_cards_trigger
  BEFORE INSERT OR UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_used_cards_are_uuids();
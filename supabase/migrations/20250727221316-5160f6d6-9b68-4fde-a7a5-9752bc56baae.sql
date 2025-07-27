-- Phase 1: Complete used_cards migration and fix data consistency issues
-- First, let's create a proper function to clean up mixed data types in used_cards

-- Create function to normalize used_cards to only contain UUIDs
CREATE OR REPLACE FUNCTION normalize_used_cards()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    room_record RECORD;
    clean_used_cards text[];
    card_item text;
BEGIN
    -- Process each room
    FOR room_record IN 
        SELECT id, used_cards 
        FROM game_rooms 
        WHERE used_cards IS NOT NULL AND array_length(used_cards, 1) > 0
    LOOP
        clean_used_cards := ARRAY[]::text[];
        
        -- Process each item in used_cards array
        FOREACH card_item IN ARRAY room_record.used_cards
        LOOP
            -- Only keep items that are valid UUIDs (36 characters with hyphens)
            IF card_item ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
                clean_used_cards := clean_used_cards || card_item;
            ELSE
                -- Try to find the UUID for this question text
                DECLARE
                    question_uuid text;
                BEGIN
                    SELECT id::text INTO question_uuid
                    FROM questions 
                    WHERE text = card_item 
                    LIMIT 1;
                    
                    IF question_uuid IS NOT NULL THEN
                        clean_used_cards := clean_used_cards || question_uuid;
                    END IF;
                END;
            END IF;
        END LOOP;
        
        -- Update the room with clean used_cards
        UPDATE game_rooms 
        SET used_cards = clean_used_cards
        WHERE id = room_record.id;
        
        RAISE NOTICE 'Cleaned room % - before: %, after: %', 
            room_record.id, array_length(room_record.used_cards, 1), array_length(clean_used_cards, 1);
    END LOOP;
END;
$$;

-- Execute the cleanup function
SELECT normalize_used_cards();

-- Add constraint to ensure used_cards only contains valid UUIDs
ALTER TABLE game_rooms 
ADD CONSTRAINT used_cards_valid_uuids 
CHECK (
    used_cards IS NULL OR 
    (
        array_length(used_cards, 1) IS NULL OR 
        (
            SELECT bool_and(
                card_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            )
            FROM unnest(used_cards) AS card_id
        )
    )
);

-- Create function to prevent question repetition within a game
CREATE OR REPLACE FUNCTION prevent_question_repetition()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this question was already used in this room
    IF EXISTS (
        SELECT 1 FROM game_responses 
        WHERE room_id = NEW.room_id 
        AND card_id = NEW.card_id
    ) THEN
        RAISE EXCEPTION 'Question already used in this game room: %', NEW.card_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent question repetition
DROP TRIGGER IF EXISTS prevent_question_repetition_trigger ON game_responses;
CREATE TRIGGER prevent_question_repetition_trigger
    BEFORE INSERT ON game_responses
    FOR EACH ROW
    EXECUTE FUNCTION prevent_question_repetition();

-- Create index for better performance on question lookups
CREATE INDEX IF NOT EXISTS idx_game_responses_room_card 
ON game_responses(room_id, card_id);

-- Create function to get used question IDs for a room
CREATE OR REPLACE FUNCTION get_used_question_ids(room_id_param uuid)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
    used_ids text[];
BEGIN
    -- Get IDs from both used_cards and game_responses
    SELECT COALESCE(
        array_agg(DISTINCT question_id), 
        ARRAY[]::text[]
    ) INTO used_ids
    FROM (
        -- From used_cards in game_rooms
        SELECT unnest(used_cards) as question_id
        FROM game_rooms 
        WHERE id = room_id_param
        
        UNION
        
        -- From game_responses
        SELECT card_id as question_id
        FROM game_responses 
        WHERE room_id = room_id_param
    ) combined_used;
    
    RETURN COALESCE(used_ids, ARRAY[]::text[]);
END;
$$;
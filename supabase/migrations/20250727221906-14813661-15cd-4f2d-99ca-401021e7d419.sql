-- Update game_responses to use question IDs instead of text
-- Create a temporary function to convert existing text-based card_ids to UUIDs
CREATE OR REPLACE FUNCTION convert_game_responses_to_ids()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    response_record RECORD;
    question_uuid text;
BEGIN
    -- Process each game response that has text-based card_id
    FOR response_record IN 
        SELECT id, card_id 
        FROM game_responses 
        WHERE NOT (card_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
    LOOP
        -- Find the UUID for this question text
        SELECT id::text INTO question_uuid
        FROM questions 
        WHERE text = response_record.card_id 
        LIMIT 1;
        
        -- Update the response if we found the UUID
        IF question_uuid IS NOT NULL THEN
            UPDATE game_responses 
            SET card_id = question_uuid
            WHERE id = response_record.id;
            
            RAISE NOTICE 'Updated response % - text: % -> UUID: %', 
                response_record.id, 
                substring(response_record.card_id, 1, 50), 
                question_uuid;
        ELSE
            RAISE NOTICE 'No UUID found for question text: %', 
                substring(response_record.card_id, 1, 50);
        END IF;
    END LOOP;
END;
$$;

-- Execute the conversion
SELECT convert_game_responses_to_ids();

-- Drop the temporary function
DROP FUNCTION convert_game_responses_to_ids();
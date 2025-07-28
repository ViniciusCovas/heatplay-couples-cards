-- Fix remaining function search_path security issues
-- Adding SET search_path = '' to all remaining functions that need it

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_used_cards()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    room_record RECORD;
    clean_used_cards text[];
    card_item text;
BEGIN
    -- Process each room
    FOR room_record IN 
        SELECT id, used_cards 
        FROM public.game_rooms 
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
                    FROM public.questions 
                    WHERE text = card_item 
                    LIMIT 1;
                    
                    IF question_uuid IS NOT NULL THEN
                        clean_used_cards := clean_used_cards || question_uuid;
                    END IF;
                END;
            END IF;
        END LOOP;
        
        -- Update the room with clean used_cards
        UPDATE public.game_rooms 
        SET used_cards = clean_used_cards
        WHERE id = room_record.id;
        
        RAISE NOTICE 'Cleaned room % - before: %, after: %', 
            room_record.id, array_length(room_record.used_cards, 1), array_length(clean_used_cards, 1);
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_question_repetition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    -- Check if this question was already used in this room
    IF EXISTS (
        SELECT 1 FROM public.game_responses 
        WHERE room_id = NEW.room_id 
        AND card_id = NEW.card_id
    ) THEN
        RAISE EXCEPTION 'Question already used in this game room: %', NEW.card_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_used_question_ids(room_id_param uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
        FROM public.game_rooms 
        WHERE id = room_id_param
        AND used_cards IS NOT NULL
        
        UNION
        
        -- From game_responses
        SELECT card_id as question_id
        FROM public.game_responses 
        WHERE room_id = room_id_param
    ) combined_used;
    
    RETURN COALESCE(used_ids, ARRAY[]::text[]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_response_sync_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Only create sync event for actual response submissions (not evaluations)
  IF NEW.response IS NOT NULL AND NEW.evaluation IS NULL THEN
    DECLARE
      evaluating_player text;
      responding_player text;
      responding_player_number integer;
      evaluating_player_number integer;
      question_text text;
    BEGIN
      -- Get the responding player's number from room_participants
      SELECT player_number INTO responding_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.player_id
      LIMIT 1;
      
      -- If we can't find the player number, log error and exit
      IF responding_player_number IS NULL THEN
        RAISE LOG 'Cannot find player_number for player_id % in room %', NEW.player_id, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Determine player roles and evaluating player number
      IF responding_player_number = 1 THEN
        responding_player := 'player1';
        evaluating_player := 'player2';
        evaluating_player_number := 2;
      ELSE
        responding_player := 'player2';
        evaluating_player := 'player1';
        evaluating_player_number := 1;
      END IF;
      
      -- Get question text
      SELECT text INTO question_text FROM public.questions WHERE id::text = NEW.card_id;
      
      -- Update game room to evaluation phase with correct turn
      UPDATE public.game_rooms 
      SET 
        current_phase = 'evaluation',
        current_turn = evaluating_player
      WHERE id = NEW.room_id;
      
      -- Insert the response_submit sync event with complete data
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'response_submit',
        jsonb_build_object(
          'question', COALESCE(question_text, 'Unknown question'),
          'response', NEW.response,
          'response_time', NEW.response_time,
          'evaluating_player', evaluating_player,
          'responding_player', responding_player,
          'evaluating_player_number', evaluating_player_number,
          'responding_player_number', responding_player_number,
          'round_number', NEW.round_number,
          'timestamp', NEW.created_at::text,
          'auto_generated', true,
          'player_name', NEW.player_id
        ),
        NEW.player_id
      );
      
      RAISE LOG 'Auto-created response_submit sync event for room % - responding player % (number %) -> evaluating player % (number %), updated phase to evaluation', 
        NEW.room_id, NEW.player_id, responding_player_number, evaluating_player, evaluating_player_number;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_game_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Ensure card references are UUIDs
  IF NEW.current_card IS NOT NULL AND NEW.current_card !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'current_card must be a valid UUID, got: %', NEW.current_card;
  END IF;
  
  -- Ensure proper turn alternation in evaluation phase
  IF NEW.current_phase = 'evaluation' THEN
    -- Check if there's a response without evaluation from the same player
    IF EXISTS (
      SELECT 1 FROM public.game_responses 
      WHERE room_id = NEW.id 
        AND response IS NOT NULL 
        AND evaluation IS NULL
        AND player_id LIKE '%' || NEW.current_turn || '%'
    ) THEN
      RAISE EXCEPTION 'Player cannot evaluate their own response. Current turn: %, but response exists for same player.', NEW.current_turn;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_response_evaluation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Prevent self-evaluation
  IF NEW.evaluation IS NOT NULL AND NEW.evaluation_by = NEW.player_id THEN
    RAISE EXCEPTION 'Player cannot evaluate their own response';
  END IF;
  
  -- Ensure card_id is a valid UUID
  IF NEW.card_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'card_id must be a valid UUID, got: %', NEW.card_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_evaluation_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND OLD.evaluation IS NULL THEN
    DECLARE
      current_round integer;
      next_turn text;
      evaluating_player_number integer;
      next_player_number integer;
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      -- Determine next player
      IF evaluating_player_number = 1 THEN
        next_turn := 'player2';
        next_player_number := 2;
      ELSE
        next_turn := 'player1';
        next_player_number := 1;
      END IF;
      
      -- Update game room to next round
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_turn,
        current_card = null,
        current_card_index = current_card_index + 1
      WHERE id = NEW.room_id;
      
      -- Create sync event for evaluation completion
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'evaluation_complete',
        jsonb_build_object(
          'evaluation', NEW.evaluation,
          'round_number', current_round,
          'next_turn', next_turn,
          'next_player_number', next_player_number,
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
      RAISE LOG 'Evaluation completed for room % round %, advancing to next round with turn: %', 
        NEW.room_id, current_round, next_turn;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_inactive_rooms()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Delete rooms older than 2 hours with no activity
  DELETE FROM public.game_rooms 
  WHERE created_at < now() - INTERVAL '2 hours' 
  AND status = 'waiting';
  
  -- Update last_activity for room cleanup
  UPDATE public.room_participants 
  SET last_activity = now() 
  WHERE last_activity < now() - INTERVAL '5 minutes';
END;
$function$;
-- Fix handle_evaluation_completion function with comprehensive logging and NULL handling
-- First drop the trigger, then the function
DROP TRIGGER IF EXISTS trigger_handle_evaluation_completion ON public.game_responses;
DROP TRIGGER IF EXISTS handle_evaluation_completion_trigger ON public.game_responses;
DROP FUNCTION IF EXISTS public.handle_evaluation_completion();

CREATE OR REPLACE FUNCTION public.handle_evaluation_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    DECLARE
      current_round integer;
      next_turn text;
      evaluating_player_number integer;
      next_player_number integer;
      total_evaluations integer;
      next_card_id text;
      available_cards text[];
      room_level integer;
      room_language text;
      room_used_cards text[];
      current_card_id text;
      current_phase_value text;
      update_count integer;
      available_count integer;
      fallback_card_id text;
      room_record RECORD;
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      RAISE LOG 'Starting evaluation completion for room %, round %, evaluation by %', 
        NEW.room_id, current_round, NEW.evaluation_by;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      IF evaluating_player_number IS NULL THEN
        RAISE LOG 'ERROR: Cannot find evaluating player % in room %', NEW.evaluation_by, NEW.room_id;
        RETURN NEW;
      END IF;
      
      RAISE LOG 'Found evaluating player number: %', evaluating_player_number;
      
      -- Get room details with row lock - using a record to preserve all data
      SELECT * INTO room_record
      FROM public.game_rooms 
      WHERE id = NEW.room_id
      FOR UPDATE;
      
      IF room_record IS NULL THEN
        RAISE LOG 'ERROR: Room % not found', NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Extract and validate room data with explicit defaults
      room_level := COALESCE(room_record.level, 1);
      room_language := COALESCE(room_record.selected_language, 'en');
      room_used_cards := COALESCE(room_record.used_cards, '{}');
      current_card_id := room_record.current_card;
      current_phase_value := room_record.current_phase;
      
      RAISE LOG 'Room data retrieved: level=%, language=%, used_cards_count=%, current_card=%, phase=%', 
        room_level, room_language, array_length(room_used_cards, 1), current_card_id, current_phase_value;
      
      -- Additional safety checks for NULL values
      IF room_level IS NULL THEN
        room_level := 1;
        RAISE LOG 'WARNING: Room level was NULL, defaulting to 1';
      END IF;
      
      IF room_language IS NULL THEN
        room_language := 'en';
        RAISE LOG 'WARNING: Room language was NULL, defaulting to en';
      END IF;
      
      -- Count total evaluations for this room
      SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
      INTO total_evaluations
      FROM public.game_responses 
      WHERE room_id = NEW.room_id;
      
      -- Determine next player (alternate between players)
      IF evaluating_player_number = 1 THEN
        next_turn := 'player2';
        next_player_number := 2;
      ELSE
        next_turn := 'player1';
        next_player_number := 1;
      END IF;
      
      RAISE LOG 'Processing evaluation: total_evaluations=%, next_turn=%, next_player=%', 
        total_evaluations, next_turn, next_player_number;
      
      -- Check if game should end (after 6+ rounds with evaluations)
      IF total_evaluations >= 6 THEN
        -- Game finished - single atomic update
        UPDATE public.game_rooms 
        SET 
          status = 'finished',
          current_phase = 'final-report',
          finished_at = NOW()
        WHERE id = NEW.room_id;
        
        GET DIAGNOSTICS update_count = ROW_COUNT;
        
        IF update_count = 0 THEN
          RAISE LOG 'ERROR: Failed to update room % to finished state', NEW.room_id;
          RETURN NEW;
        END IF;
        
        -- Create single sync event for game completion
        INSERT INTO public.game_sync (
          room_id, 
          action_type, 
          action_data, 
          triggered_by
        ) VALUES (
          NEW.room_id,
          'game_finish',
          jsonb_build_object(
            'final_round', current_round,
            'total_evaluations', total_evaluations,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Game completed after % evaluations for room %', total_evaluations, NEW.room_id;
        
      ELSE
        -- Continue game - prepare next round
        
        -- Add current card to used_cards if not already there
        IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(room_used_cards)) THEN
          room_used_cards := array_append(room_used_cards, current_card_id);
          RAISE LOG 'Added current card % to used_cards', current_card_id;
        END IF;
        
        RAISE LOG 'About to select next card with level=%, language=%', room_level, room_language;
        
        -- Primary card selection strategy: Get available cards that haven't been used
        BEGIN
          SELECT array_agg(q.id::text) INTO available_cards
          FROM public.questions q
          JOIN public.levels l ON q.level_id = l.id
          WHERE l.sort_order = room_level
            AND q.language = room_language
            AND q.is_active = true
            AND NOT (q.id::text = ANY(room_used_cards))
          ORDER BY RANDOM();
          
          RAISE LOG 'Primary query result: available_cards count = %', 
            COALESCE(array_length(available_cards, 1), 0);
          
        EXCEPTION
          WHEN OTHERS THEN
            RAISE LOG 'ERROR in primary card selection: %', SQLERRM;
            available_cards := NULL;
        END;
        
        -- Select next card with multiple fallback strategies
        IF available_cards IS NOT NULL AND array_length(available_cards, 1) > 0 THEN
          next_card_id := available_cards[1];
          RAISE LOG 'SUCCESS: Selected new card % from % available unused cards', 
            next_card_id, array_length(available_cards, 1);
        ELSE
          -- Fallback 1: Try without used_cards filter
          RAISE LOG 'Fallback 1: Trying without used_cards filter for level=%, language=%', 
            room_level, room_language;
          
          BEGIN
            SELECT q.id::text INTO fallback_card_id
            FROM public.questions q
            JOIN public.levels l ON q.level_id = l.id
            WHERE l.sort_order = room_level
              AND q.language = room_language
              AND q.is_active = true
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF fallback_card_id IS NOT NULL THEN
              next_card_id := fallback_card_id;
              RAISE LOG 'Fallback 1 SUCCESS: Selected card % (ignored used_cards)', next_card_id;
            END IF;
            
          EXCEPTION
            WHEN OTHERS THEN
              RAISE LOG 'ERROR in fallback 1: %', SQLERRM;
          END;
        END IF;
        
        -- Fallback 2: Try with default language if still no card
        IF next_card_id IS NULL THEN
          RAISE LOG 'Fallback 2: Trying with default language (en) for level=%', room_level;
          
          BEGIN
            SELECT q.id::text INTO fallback_card_id
            FROM public.questions q
            JOIN public.levels l ON q.level_id = l.id
            WHERE l.sort_order = room_level
              AND q.language = 'en'
              AND q.is_active = true
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF fallback_card_id IS NOT NULL THEN
              next_card_id := fallback_card_id;
              RAISE LOG 'Fallback 2 SUCCESS: Selected card % with default language', next_card_id;
            END IF;
            
          EXCEPTION
            WHEN OTHERS THEN
              RAISE LOG 'ERROR in fallback 2: %', SQLERRM;
          END;
        END IF;
        
        -- Fallback 3: Try with level 1 and default language
        IF next_card_id IS NULL THEN
          RAISE LOG 'Fallback 3: Trying with level 1 and default language';
          
          BEGIN
            SELECT q.id::text INTO fallback_card_id
            FROM public.questions q
            JOIN public.levels l ON q.level_id = l.id
            WHERE l.sort_order = 1
              AND q.language = 'en'
              AND q.is_active = true
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF fallback_card_id IS NOT NULL THEN
              next_card_id := fallback_card_id;
              RAISE LOG 'Fallback 3 SUCCESS: Selected card % with level 1 and en', next_card_id;
            END IF;
            
          EXCEPTION
            WHEN OTHERS THEN
              RAISE LOG 'ERROR in fallback 3: %', SQLERRM;
          END;
        END IF;
        
        -- Final check: Ensure we have a valid card
        IF next_card_id IS NULL THEN
          RAISE EXCEPTION 'CRITICAL ERROR: No questions available after all fallback attempts. Level: %, Language: %', 
            room_level, room_language;
        END IF;
        
        RAISE LOG 'FINAL: Selected card % for room %, next turn: %', 
          next_card_id, NEW.room_id, next_turn;
        
        -- SINGLE ATOMIC UPDATE for room state transition
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          current_card = next_card_id,
          current_card_index = COALESCE(current_card_index, 0) + 1,
          used_cards = room_used_cards
        WHERE id = NEW.room_id;
        
        -- Verify the update succeeded
        GET DIAGNOSTICS update_count = ROW_COUNT;
        
        IF update_count = 0 THEN
          RAISE EXCEPTION 'Failed to update room state for room % - no rows affected', NEW.room_id;
        END IF;
        
        RAISE LOG 'Room update SUCCESS: rows affected = %', update_count;
        
        -- Prevent duplicate sync events by checking if one already exists for this evaluation
        IF NOT EXISTS (
          SELECT 1 FROM public.game_sync 
          WHERE room_id = NEW.room_id 
          AND action_type = 'evaluation_complete'
          AND (action_data->>'round_number')::integer = current_round
          AND triggered_by = NEW.evaluation_by
          AND created_at > NOW() - INTERVAL '10 seconds'
        ) THEN
          -- Create SINGLE sync event for evaluation completion and next round
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
              'next_card_id', next_card_id,
              'total_evaluations', total_evaluations,
              'timestamp', NOW()::text,
              'auto_generated', true
            ),
            NEW.evaluation_by
          );
          
          RAISE LOG 'Created sync event for evaluation completion';
        ELSE
          RAISE LOG 'Skipped sync event creation - duplicate exists';
        END IF;
        
        RAISE LOG 'COMPLETED: Room % round % - phase: card-display, turn: %, card: %', 
          NEW.room_id, current_round, next_turn, next_card_id;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'CRITICAL ERROR in handle_evaluation_completion for room %: % (SQLSTATE: %)', 
          NEW.room_id, SQLERRM, SQLSTATE;
        -- Re-raise the exception to prevent silent failures
        RAISE;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_handle_evaluation_completion
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_evaluation_completion();
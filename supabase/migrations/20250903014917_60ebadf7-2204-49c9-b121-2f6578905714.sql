-- Fix the handle_evaluation_completion trigger with improved atomic updates and duplicate prevention
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
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      IF evaluating_player_number IS NULL THEN
        RAISE LOG 'Cannot find evaluating player % in room %', NEW.evaluation_by, NEW.room_id;
        RETURN NEW;
      END IF;
      
      -- Get room details with row lock to prevent race conditions
      SELECT level, selected_language, COALESCE(used_cards, '{}'), current_card, current_phase
      INTO room_level, room_language, room_used_cards, current_card_id, current_phase_value
      FROM public.game_rooms 
      WHERE id = NEW.room_id
      FOR UPDATE;
      
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
      
      RAISE LOG 'Processing evaluation for room %, round %, total evaluations: %, evaluating player: %, current phase: %', 
        NEW.room_id, current_round, total_evaluations, evaluating_player_number, current_phase_value;
      
      -- Check if game should end (after 6+ rounds with evaluations)
      IF total_evaluations >= 6 THEN
        -- Game finished - single atomic update with explicit row count check
        UPDATE public.game_rooms 
        SET 
          status = 'finished',
          current_phase = 'final-report',
          finished_at = NOW()
        WHERE id = NEW.room_id;
        
        GET DIAGNOSTICS update_count = ROW_COUNT;
        
        IF update_count = 0 THEN
          RAISE LOG 'Failed to update room % to finished state', NEW.room_id;
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
        END IF;
        
        -- Get available cards that haven't been used
        SELECT array_agg(q.id::text) INTO available_cards
        FROM public.questions q
        JOIN public.levels l ON q.level_id = l.id
        WHERE l.sort_order = room_level
          AND q.language = room_language
          AND q.is_active = true
          AND NOT (q.id::text = ANY(room_used_cards));
        
        -- Select random card from available cards
        IF available_cards IS NOT NULL AND array_length(available_cards, 1) > 0 THEN
          next_card_id := available_cards[1 + floor(random() * array_length(available_cards, 1))::integer];
        ELSE
          -- Fallback to any card if no unused cards available
          SELECT q.id::text INTO next_card_id
          FROM public.questions q
          JOIN public.levels l ON q.level_id = l.id
          WHERE l.sort_order = room_level
            AND q.language = room_language
            AND q.is_active = true
          ORDER BY RANDOM()
          LIMIT 1;
        END IF;
        
        RAISE LOG 'Selected next card % for room %, next turn: %, used cards count: %', 
          next_card_id, NEW.room_id, next_turn, array_length(room_used_cards, 1);
        
        -- SINGLE ATOMIC UPDATE for room state transition with explicit row count check
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
        END IF;
        
        RAISE LOG 'Successfully updated room % round % - phase: card-display, turn: %, card: %, rows affected: %', 
          NEW.room_id, current_round, next_turn, next_card_id, update_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error in handle_evaluation_completion for room %: %', NEW.room_id, SQLERRM;
        -- Re-raise the exception to prevent silent failures
        RAISE;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;
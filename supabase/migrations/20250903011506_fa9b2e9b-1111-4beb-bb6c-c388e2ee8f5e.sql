-- Fix the array comparison syntax in handle_evaluation_completion function
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND OLD.evaluation IS NULL THEN
    DECLARE
      current_round integer;
      next_turn text;
      evaluating_player_number integer;
      next_player_number integer;
      total_responses integer;
      total_evaluations integer;
      next_card_id text;
      available_cards text[];
      room_level integer;
      room_language text;
      room_used_cards text[];
    BEGIN
      -- Get current round number
      current_round := NEW.round_number;
      
      -- Get the evaluating player's number
      SELECT player_number INTO evaluating_player_number
      FROM public.room_participants 
      WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
      LIMIT 1;
      
      -- Get room details
      SELECT level, selected_language, COALESCE(used_cards, '{}') INTO room_level, room_language, room_used_cards
      FROM public.game_rooms 
      WHERE id = NEW.room_id;
      
      -- Count total responses and evaluations for this room
      SELECT 
        COUNT(*) FILTER (WHERE response IS NOT NULL) as resp_count,
        COUNT(*) FILTER (WHERE evaluation IS NOT NULL) as eval_count
      INTO total_responses, total_evaluations
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
      
      -- Check if game should end (after 6+ rounds with evaluations)
      IF total_evaluations >= 6 THEN
        UPDATE public.game_rooms 
        SET 
          status = 'finished',
          current_phase = 'final-report',
          finished_at = NOW()
        WHERE id = NEW.room_id;
        
        -- Create sync event for game completion
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
            'total_responses', total_responses,
            'total_evaluations', total_evaluations,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Game completed after % evaluations for room %', total_evaluations, NEW.room_id;
      ELSE
        -- Get available cards that haven't been used (FIXED ARRAY COMPARISON)
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
        
        -- Continue to next round with new card
        UPDATE public.game_rooms 
        SET 
          current_phase = 'card-display',
          current_turn = next_turn,
          current_card = next_card_id,
          current_card_index = current_card_index + 1,
          used_cards = array_append(room_used_cards, next_card_id)
        WHERE id = NEW.room_id;
        
        -- Create sync event for evaluation completion and next round
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
            'total_responses', total_responses,
            'total_evaluations', total_evaluations,
            'timestamp', NOW()::text,
            'auto_generated', true
          ),
          NEW.evaluation_by
        );
        
        RAISE LOG 'Evaluation completed for room % round %, advancing to next round with turn: % and card: %', 
          NEW.room_id, current_round, next_turn, next_card_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$
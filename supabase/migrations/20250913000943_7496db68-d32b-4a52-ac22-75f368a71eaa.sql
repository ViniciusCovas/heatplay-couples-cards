-- CLEAN SLATE APPROACH: Remove all conflicting evaluation functions and triggers

-- Drop all evaluation-related triggers first
DROP TRIGGER IF EXISTS evaluation_completion_trigger_v4 ON public.game_responses;
DROP TRIGGER IF EXISTS evaluation_completion_trigger_v3 ON public.game_responses;
DROP TRIGGER IF EXISTS evaluation_completion_trigger_v2 ON public.game_responses;
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS simple_evaluation_trigger_on_responses ON public.game_responses;

-- Drop all conflicting evaluation functions
DROP FUNCTION IF EXISTS public.handle_evaluation_completion_v4() CASCADE;
DROP FUNCTION IF EXISTS public.handle_evaluation_completion_v3() CASCADE;
DROP FUNCTION IF EXISTS public.handle_evaluation_completion_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_evaluation_completion() CASCADE;
DROP FUNCTION IF EXISTS public.simple_evaluation_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.advance_game_to_next_round(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_recover_technical_issues() CASCADE;
DROP FUNCTION IF EXISTS public.repair_stuck_evaluations() CASCADE;

-- Clean up queue-related stuff that's not working
DROP TABLE IF EXISTS public.game_flow_queue CASCADE;

-- Create ONE simple, working evaluation function
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_clean()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  evaluating_player_number INTEGER;
  next_turn TEXT;
  total_evaluations INTEGER;
  next_card_id TEXT;
  room_used_cards TEXT[];
  current_card_id TEXT;
BEGIN
  -- Only trigger when evaluation is added
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    
    -- Get evaluating player number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;
    
    IF evaluating_player_number IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Count total evaluations
    SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
    INTO total_evaluations
    FROM public.game_responses 
    WHERE room_id = NEW.room_id;
    
    -- Determine next player
    IF evaluating_player_number = 1 THEN
      next_turn := 'player2';
    ELSE
      next_turn := 'player1';
    END IF;
    
    -- Check if game should end (after 6 evaluations)
    IF total_evaluations >= 6 THEN
      UPDATE public.game_rooms 
      SET 
        status = 'finished',
        current_phase = 'final-report',
        finished_at = NOW()
      WHERE id = NEW.room_id;
      
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'game_finish',
        jsonb_build_object(
          'final_round', NEW.round_number,
          'total_evaluations', total_evaluations,
          'timestamp', NOW()::text
        ),
        NEW.evaluation_by
      );
      
    ELSE
      -- Continue game - get next card
      SELECT current_card, used_cards 
      INTO current_card_id, room_used_cards
      FROM public.game_rooms 
      WHERE id = NEW.room_id;
      
      -- Add current card to used cards
      IF current_card_id IS NOT NULL THEN
        room_used_cards := array_append(COALESCE(room_used_cards, '{}'), current_card_id);
      END IF;
      
      -- Get next card
      next_card_id := public.select_next_card_robust(NEW.room_id, room_used_cards);
      
      -- Update room state
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_turn,
        current_card = next_card_id,
        current_card_index = COALESCE(current_card_index, 0) + 1,
        used_cards = room_used_cards
      WHERE id = NEW.room_id;
      
      -- Create sync event
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
          'round_number', NEW.round_number,
          'next_turn', next_turn,
          'next_card_id', next_card_id,
          'total_evaluations', total_evaluations,
          'timestamp', NOW()::text
        ),
        NEW.evaluation_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER evaluation_completion_trigger_clean
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion_clean();
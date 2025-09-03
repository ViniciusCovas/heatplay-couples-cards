-- Phase 1: Create a more reliable game flow system
-- First, let's create a simpler, more robust trigger and supporting functions

-- 1. Create a game flow queue table for reliable processing
CREATE TABLE IF NOT EXISTS public.game_flow_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'evaluation_complete', 'response_submit', etc.
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS for the queue table
ALTER TABLE public.game_flow_queue ENABLE ROW LEVEL SECURITY;

-- Allow room participants to insert events
CREATE POLICY "Room participants can queue events" 
ON public.game_flow_queue 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id 
    AND player_id = (auth.uid())::text
  )
);

-- Allow viewing of events for room participants
CREATE POLICY "Room participants can view queue events" 
ON public.game_flow_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id 
    AND player_id = (auth.uid())::text
  )
);

-- 2. Create a robust card selection function with fallbacks
CREATE OR REPLACE FUNCTION public.select_next_card_robust(
  room_id_param UUID,
  current_used_cards TEXT[] DEFAULT '{}'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  room_level INTEGER;
  room_language TEXT;
  next_card_id TEXT;
  available_cards TEXT[];
BEGIN
  -- Get room details with explicit error handling
  SELECT level, selected_language 
  INTO room_level, room_language
  FROM public.game_rooms 
  WHERE id = room_id_param;
  
  -- Validate we found the room
  IF room_level IS NULL THEN
    RAISE EXCEPTION 'Room not found: %', room_id_param;
  END IF;
  
  -- Set safe defaults
  room_level := COALESCE(room_level, 1);
  room_language := COALESCE(room_language, 'en');
  
  -- Strategy 1: Get unused cards for current level and language
  SELECT array_agg(q.id::text) INTO available_cards
  FROM public.questions q
  JOIN public.levels l ON q.level_id = l.id
  WHERE l.sort_order = room_level
    AND q.language = room_language
    AND q.is_active = true
    AND NOT (q.id::text = ANY(current_used_cards))
  ORDER BY RANDOM();
  
  IF available_cards IS NOT NULL AND array_length(available_cards, 1) > 0 THEN
    RETURN available_cards[1];
  END IF;
  
  -- Strategy 2: Fallback to any card for level (ignore used_cards)
  SELECT q.id::text INTO next_card_id
  FROM public.questions q
  JOIN public.levels l ON q.level_id = l.id
  WHERE l.sort_order = room_level
    AND q.language = room_language
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF next_card_id IS NOT NULL THEN
    RETURN next_card_id;
  END IF;
  
  -- Strategy 3: Fallback to English
  SELECT q.id::text INTO next_card_id
  FROM public.questions q
  JOIN public.levels l ON q.level_id = l.id
  WHERE l.sort_order = room_level
    AND q.language = 'en'
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF next_card_id IS NOT NULL THEN
    RETURN next_card_id;
  END IF;
  
  -- Strategy 4: Final fallback to level 1 English
  SELECT q.id::text INTO next_card_id
  FROM public.questions q
  JOIN public.levels l ON q.level_id = l.id
  WHERE l.sort_order = 1
    AND q.language = 'en'
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF next_card_id IS NULL THEN
    RAISE EXCEPTION 'No questions available in database';
  END IF;
  
  RETURN next_card_id;
END;
$$;

-- 3. Create a reliable game state transition function
CREATE OR REPLACE FUNCTION public.advance_game_to_next_round(
  room_id_param UUID,
  current_round INTEGER,
  evaluating_player_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  evaluating_player_number INTEGER;
  next_turn TEXT;
  next_player_number INTEGER;
  current_card_id TEXT;
  room_used_cards TEXT[];
  next_card_id TEXT;
  total_evaluations INTEGER;
  update_count INTEGER;
BEGIN
  -- Get evaluating player number with explicit error handling
  SELECT player_number INTO evaluating_player_number
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = evaluating_player_id
  LIMIT 1;
  
  IF evaluating_player_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'player_not_found');
  END IF;
  
  -- Count total evaluations
  SELECT COUNT(*) FILTER (WHERE evaluation IS NOT NULL)
  INTO total_evaluations
  FROM public.game_responses 
  WHERE room_id = room_id_param;
  
  -- Check if game should end
  IF total_evaluations >= 6 THEN
    UPDATE public.game_rooms 
    SET 
      status = 'finished',
      current_phase = 'final-report',
      finished_at = NOW()
    WHERE id = room_id_param;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    IF update_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'room_update_failed');
    END IF;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_finished', true,
      'total_evaluations', total_evaluations
    );
  END IF;
  
  -- Determine next player
  IF evaluating_player_number = 1 THEN
    next_turn := 'player2';
    next_player_number := 2;
  ELSE
    next_turn := 'player1';
    next_player_number := 1;
  END IF;
  
  -- Get current room state
  SELECT current_card, used_cards 
  INTO current_card_id, room_used_cards
  FROM public.game_rooms 
  WHERE id = room_id_param;
  
  -- Add current card to used cards
  IF current_card_id IS NOT NULL AND NOT (current_card_id = ANY(COALESCE(room_used_cards, '{}'))) THEN
    room_used_cards := array_append(COALESCE(room_used_cards, '{}'), current_card_id);
  END IF;
  
  -- Select next card using robust function
  next_card_id := public.select_next_card_robust(room_id_param, room_used_cards);
  
  -- Update room state atomically
  UPDATE public.game_rooms 
  SET 
    current_phase = 'card-display',
    current_turn = next_turn,
    current_card = next_card_id,
    current_card_index = COALESCE(current_card_index, 0) + 1,
    used_cards = room_used_cards
  WHERE id = room_id_param;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  IF update_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_update_failed');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'next_turn', next_turn,
    'next_player_number', next_player_number,
    'next_card_id', next_card_id,
    'total_evaluations', total_evaluations
  );
END;
$$;

-- 4. Replace the problematic trigger with a simpler, more reliable one
DROP TRIGGER IF EXISTS handle_evaluation_completion_trigger ON public.game_responses;

CREATE OR REPLACE FUNCTION public.simple_evaluation_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when evaluation is added
  IF NEW.evaluation IS NOT NULL AND (OLD.evaluation IS NULL OR OLD.evaluation IS DISTINCT FROM NEW.evaluation) THEN
    -- Queue the evaluation completion for reliable processing
    INSERT INTO public.game_flow_queue (
      room_id, 
      event_type, 
      event_data
    ) VALUES (
      NEW.room_id,
      'evaluation_complete',
      jsonb_build_object(
        'response_id', NEW.id,
        'round_number', NEW.round_number,
        'evaluation_by', NEW.evaluation_by,
        'evaluation', NEW.evaluation,
        'timestamp', NOW()::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER simple_evaluation_completion_trigger
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_evaluation_trigger();

-- 5. Create a queue processor function that can be called reliably
CREATE OR REPLACE FUNCTION public.process_game_flow_queue()
RETURNS TABLE(processed_count INTEGER, error_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queue_item RECORD;
  result_data JSONB;
  processed_total INTEGER := 0;
  error_total INTEGER := 0;
BEGIN
  -- Process unprocessed queue items
  FOR queue_item IN 
    SELECT * FROM public.game_flow_queue 
    WHERE processed = false 
    AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      IF queue_item.event_type = 'evaluation_complete' THEN
        -- Process evaluation completion
        result_data := public.advance_game_to_next_round(
          queue_item.room_id,
          (queue_item.event_data->>'round_number')::INTEGER,
          queue_item.event_data->>'evaluation_by'
        );
        
        IF result_data->>'success' = 'true' THEN
          -- Create sync event for UI
          INSERT INTO public.game_sync (
            room_id, 
            action_type, 
            action_data, 
            triggered_by
          ) VALUES (
            queue_item.room_id,
            'evaluation_complete',
            jsonb_build_object(
              'evaluation', queue_item.event_data->>'evaluation',
              'round_number', (queue_item.event_data->>'round_number')::INTEGER,
              'next_turn', result_data->>'next_turn',
              'next_player_number', (result_data->>'next_player_number')::INTEGER,
              'next_card_id', result_data->>'next_card_id',
              'total_evaluations', (result_data->>'total_evaluations')::INTEGER,
              'game_finished', COALESCE((result_data->>'game_finished')::BOOLEAN, false),
              'timestamp', NOW()::text,
              'queue_processed', true
            ),
            queue_item.event_data->>'evaluation_by'
          );
          
          processed_total := processed_total + 1;
        ELSE
          error_total := error_total + 1;
        END IF;
        
        -- Mark as processed
        UPDATE public.game_flow_queue 
        SET 
          processed = true,
          processed_at = NOW(),
          error_message = CASE 
            WHEN result_data->>'success' = 'false' 
            THEN result_data->>'error' 
            ELSE NULL 
          END
        WHERE id = queue_item.id;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Mark as processed with error
        UPDATE public.game_flow_queue 
        SET 
          processed = true,
          processed_at = NOW(),
          error_message = SQLERRM
        WHERE id = queue_item.id;
        
        error_total := error_total + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed_total, error_total;
END;
$$;

-- 6. Create a function to detect and fix stuck rooms
CREATE OR REPLACE FUNCTION public.detect_and_fix_stuck_rooms()
RETURNS TABLE(room_id UUID, action_taken TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation phase for more than 5 minutes
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gr.room_code,
      gr.current_phase,
      gr.current_turn,
      COUNT(DISTINCT gres.id) as pending_evaluations
    FROM public.game_rooms gr
    LEFT JOIN public.game_responses gres ON gr.id = gres.room_id 
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
    WHERE gr.current_phase = 'evaluation'
      AND gr.status = 'playing'
      AND gr.started_at > NOW() - INTERVAL '2 hours'
      AND gr.started_at < NOW() - INTERVAL '5 minutes'
    GROUP BY gr.id, gr.room_code, gr.current_phase, gr.current_turn
    HAVING COUNT(DISTINCT gres.id) > 0
  LOOP
    -- Queue a recovery event
    INSERT INTO public.game_flow_queue (
      room_id, 
      event_type, 
      event_data
    ) VALUES (
      stuck_room.room_id,
      'evaluation_complete',
      jsonb_build_object(
        'auto_recovery', true,
        'round_number', 1,
        'evaluation_by', 'system_recovery',
        'evaluation', 'Auto-recovered from stuck state',
        'timestamp', NOW()::text
      )
    );
    
    RETURN QUERY SELECT stuck_room.room_id, 'queued_recovery'::TEXT;
  END LOOP;
END;
$$;
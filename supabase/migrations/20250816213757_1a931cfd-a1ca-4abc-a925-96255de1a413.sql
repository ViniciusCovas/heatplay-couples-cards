-- Phase 1: Fix Room Joining RLS Issues
-- 1. Allow anonymous room discovery by code
DROP POLICY IF EXISTS "Users can discover rooms by code" ON public.game_rooms;

CREATE POLICY "Anyone can discover open rooms by code" 
ON public.game_rooms 
FOR SELECT 
USING (
  status IN ('waiting', 'playing') 
  AND room_code IS NOT NULL
);

-- 2. Improve room joining RPC function with better retry logic
CREATE OR REPLACE FUNCTION public.join_room_with_retry(
  room_code_param text, 
  player_id_param text,
  max_attempts integer DEFAULT 3
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_status text;
  v_existing record;
  v_assigned integer;
  attempt_count integer := 0;
BEGIN
  -- Input validation
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  IF player_id_param IS NULL OR trim(player_id_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player_id');
  END IF;

  -- Retry loop for room joining
  WHILE attempt_count < max_attempts LOOP
    BEGIN
      attempt_count := attempt_count + 1;
      
      -- Find room
      SELECT id, status INTO v_room_id, v_status
      FROM public.game_rooms
      WHERE room_code = upper(trim(room_code_param))
        AND status IN ('waiting','playing')
      LIMIT 1;

      IF v_room_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
      END IF;

      -- Check if already participant
      SELECT * INTO v_existing
      FROM public.room_participants
      WHERE room_id = v_room_id AND player_id = player_id_param
      LIMIT 1;

      IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', true,
          'room_id', v_room_id,
          'player_number', v_existing.player_number,
          'already_joined', true,
          'attempt', attempt_count
        );
      END IF;

      -- Assign player number atomically
      SELECT public.assign_player_number(v_room_id, player_id_param) INTO v_assigned;

      IF v_assigned IS NULL OR v_assigned = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'room_full');
      END IF;

      -- Insert participation
      INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
      VALUES (v_room_id, player_id_param, true, v_assigned);

      RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_id,
        'player_number', v_assigned,
        'already_joined', false,
        'attempt', attempt_count
      );

    EXCEPTION
      WHEN OTHERS THEN
        -- If this is the last attempt, return error
        IF attempt_count >= max_attempts THEN
          RETURN jsonb_build_object(
            'success', false, 
            'error', 'join_failed_after_retries',
            'details', SQLERRM,
            'attempts', attempt_count
          );
        END IF;
        -- Otherwise continue loop for retry
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', false, 
    'error', 'max_attempts_reached',
    'attempts', attempt_count
  );
END;
$function$;

-- 3. Fix evaluation completion sync - ensure responder gets notified
CREATE OR REPLACE FUNCTION public.handle_evaluation_completion_with_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  responding_player_id text;
  current_round integer;
  next_turn text;
  evaluating_player_number integer;
  next_player_number integer;
  total_responses integer;
  total_evaluations integer;
  question_text text;
BEGIN
  -- Only trigger when evaluation is added (not when response is created)
  IF NEW.evaluation IS NOT NULL AND OLD.evaluation IS NULL THEN
    -- Get current round number
    current_round := NEW.round_number;
    
    -- Get the responding player ID (who gave the response being evaluated)
    responding_player_id := NEW.player_id;
    
    -- Get the evaluating player's number
    SELECT player_number INTO evaluating_player_number
    FROM public.room_participants 
    WHERE room_id = NEW.room_id AND player_id = NEW.evaluation_by
    LIMIT 1;
    
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
    
    -- Get question text for sync event
    SELECT text INTO question_text 
    FROM public.questions 
    WHERE id::text = NEW.card_id;
    
    -- Check if game should end (after 6+ rounds with evaluations)
    IF total_evaluations >= 6 THEN
      UPDATE public.game_rooms 
      SET 
        status = 'finished',
        current_phase = 'final-report',
        finished_at = NOW()
      WHERE id = NEW.room_id;
      
      -- Create sync event for game completion - notify ALL players
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
          'evaluation', NEW.evaluation,
          'question', COALESCE(question_text, 'Unknown question'),
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
      
    ELSE
      -- Continue to next round
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_turn,
        current_card = null,
        current_card_index = current_card_index + 1
      WHERE id = NEW.room_id;
      
      -- Create sync event for evaluation completion - CRITICAL: notify the responder
      INSERT INTO public.game_sync (
        room_id, 
        action_type, 
        action_data, 
        triggered_by
      ) VALUES (
        NEW.room_id,
        'evaluation_submit',
        jsonb_build_object(
          'evaluation', NEW.evaluation,
          'question', COALESCE(question_text, 'Unknown question'),
          'response', NEW.response,
          'round_number', current_round,
          'next_turn', next_turn,
          'next_player_number', next_player_number,
          'responding_player_id', responding_player_id,
          'evaluation_by', NEW.evaluation_by,
          'total_responses', total_responses,
          'total_evaluations', total_evaluations,
          'nextCard', true,
          'timestamp', NOW()::text,
          'auto_generated', true
        ),
        NEW.evaluation_by
      );
    END IF;
    
    RAISE LOG 'Evaluation completed with sync - room %, round %, responder: %, evaluator: %', 
      NEW.room_id, current_round, responding_player_id, NEW.evaluation_by;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS handle_evaluation_completion_trigger ON public.game_responses;
CREATE TRIGGER handle_evaluation_completion_trigger
AFTER UPDATE ON public.game_responses
FOR EACH ROW
EXECUTE FUNCTION handle_evaluation_completion_with_sync();

-- 4. Add connection state monitoring table
CREATE TABLE IF NOT EXISTS public.connection_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  connection_status text NOT NULL DEFAULT 'connected',
  last_ping timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Enable RLS on connection_states
ALTER TABLE public.connection_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for connection_states
CREATE POLICY "Room participants can manage connection states"
ON public.connection_states
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = connection_states.room_id 
    AND player_id = connection_states.player_id
  )
);

-- 5. Create function for reliable game state sync
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(
  room_id_param uuid,
  player_id_param text
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_room record;
  missed_events record[];
  player_participant record;
BEGIN
  -- Verify player participation
  SELECT * INTO player_participant
  FROM public.room_participants
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF player_participant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Get current room state
  SELECT * INTO current_room
  FROM public.game_rooms
  WHERE id = room_id_param;
  
  IF current_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Update connection state
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', now())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = now(),
    updated_at = now();
  
  -- Return current game state for sync
  RETURN jsonb_build_object(
    'success', true,
    'room_state', to_jsonb(current_room),
    'player_number', player_participant.player_number,
    'connection_updated', true
  );
END;
$function$;
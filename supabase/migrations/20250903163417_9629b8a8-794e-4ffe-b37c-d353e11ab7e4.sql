-- Phase 1: Database Cleanup & Optimization (Critical)

-- 1. Remove duplicate triggers to prevent race conditions
DROP TRIGGER IF EXISTS simple_evaluation_completion_trigger ON public.game_responses;
DROP TRIGGER IF EXISTS trigger_handle_evaluation_completion ON public.game_responses;

-- Keep only ONE evaluation trigger (the one we just added)
-- simple_evaluation_trigger_on_game_responses is already installed

-- 2. Clean up stuck rooms - Force advance all rooms stuck in evaluation phase
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = CASE 
    WHEN current_turn = 'player1' THEN 'player2'
    ELSE 'player1'
  END
WHERE current_phase = 'evaluation' 
  AND status = 'playing'
  AND started_at < NOW() - INTERVAL '2 minutes';

-- 3. Add immediate fallback system for stuck rooms
CREATE OR REPLACE FUNCTION public.auto_advance_stuck_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation for more than 60 seconds
  FOR stuck_room IN 
    SELECT id, current_turn, current_phase
    FROM public.game_rooms 
    WHERE current_phase = 'evaluation'
      AND status = 'playing'
      AND started_at > NOW() - INTERVAL '2 hours'
      AND started_at < NOW() - INTERVAL '60 seconds'
  LOOP
    -- Auto-advance the room
    INSERT INTO public.game_flow_queue (
      room_id, 
      event_type, 
      event_data
    ) VALUES (
      stuck_room.id,
      'evaluation_complete',
      jsonb_build_object(
        'auto_advance', true,
        'round_number', 1,
        'evaluation_by', 'system_timeout',
        'evaluation', 'Auto-advanced due to timeout',
        'timestamp', NOW()::text
      )
    );
    
    RAISE LOG 'Auto-advanced stuck room: %', stuck_room.id;
  END LOOP;
END;
$$;

-- 4. Optimize connection monitoring - reduce ping intervals
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(room_id_param uuid, player_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_room record;
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
  
  -- Update connection state with faster ping
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', now())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = now(),
    updated_at = now();
  
  -- Auto-advance if room is stuck and this player is still connected
  IF current_room.current_phase = 'evaluation' 
     AND current_room.started_at < NOW() - INTERVAL '45 seconds' THEN
    PERFORM public.auto_advance_stuck_rooms();
  END IF;
  
  -- Return current game state for sync
  RETURN jsonb_build_object(
    'success', true,
    'room_state', to_jsonb(current_room),
    'player_number', player_participant.player_number,
    'connection_updated', true,
    'real_time_sync', true
  );
END;
$$;

-- 5. Create immediate timeout detection system
CREATE OR REPLACE FUNCTION public.detect_disconnected_players()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark players as disconnected if no ping in 15 seconds
  UPDATE public.connection_states 
  SET connection_status = 'disconnected'
  WHERE last_ping < NOW() - INTERVAL '15 seconds'
    AND connection_status = 'connected';
    
  -- Auto-advance rooms where opponent disconnected
  INSERT INTO public.game_flow_queue (room_id, event_type, event_data)
  SELECT DISTINCT
    gr.id,
    'player_disconnected',
    jsonb_build_object(
      'disconnected_player', cs.player_id,
      'auto_advance', true,
      'timestamp', NOW()::text
    )
  FROM public.game_rooms gr
  JOIN public.connection_states cs ON gr.id = cs.room_id
  WHERE cs.connection_status = 'disconnected'
    AND cs.last_ping < NOW() - INTERVAL '30 seconds'
    AND gr.status = 'playing'
    AND gr.current_phase = 'evaluation';
END;
$$;
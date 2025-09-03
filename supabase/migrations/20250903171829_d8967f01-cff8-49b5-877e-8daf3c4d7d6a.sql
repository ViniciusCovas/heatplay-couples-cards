-- Fix security warnings from linter

-- 1. Fix Function Search Path Mutable warning by adding SET search_path to all functions
-- Update existing functions that don't have proper search_path

-- Fix auto_advance_stuck_evaluations function
CREATE OR REPLACE FUNCTION public.auto_advance_stuck_evaluations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation for more than 45 seconds
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gres.id as response_id,
      gres.evaluation_by,
      gres.round_number
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gr.current_phase = 'evaluation'
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gres.created_at < NOW() - INTERVAL '45 seconds'
      AND gr.status = 'playing'
  LOOP
    -- Auto-submit a neutral evaluation
    UPDATE public.game_responses 
    SET 
      evaluation = 'Auto-advanced due to timeout',
      evaluation_by = stuck_room.evaluation_by
    WHERE id = stuck_room.response_id;
    
    RAISE LOG 'Auto-advanced stuck room % after 45s timeout', stuck_room.room_id;
  END LOOP;
END;
$$;

-- Add SET search_path to functions that need it
CREATE OR REPLACE FUNCTION public.room_is_open(room_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE id = room_id_param
      AND status IN ('waiting', 'playing')
  );
$$;

-- Create sync_game_state_reliably function that was referenced but missing
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(
  room_id_param uuid,
  player_id_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  room_exists boolean;
  participant_exists boolean;
BEGIN
  -- Check if room exists and is active
  SELECT EXISTS(
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND status IN ('waiting', 'playing')
  ) INTO room_exists;
  
  IF NOT room_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Check if player is a participant
  SELECT EXISTS(
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  ) INTO participant_exists;
  
  IF NOT participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Update connection state
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', NOW())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = NOW(),
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'room_id', room_id_param,
    'player_id', player_id_param,
    'timestamp', NOW()
  );
END;
$$;

-- Create detect_disconnected_players function referenced in the code
CREATE OR REPLACE FUNCTION public.detect_disconnected_players()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark players as disconnected if no ping in last 30 seconds
  UPDATE public.connection_states 
  SET connection_status = 'disconnected'
  WHERE last_ping < NOW() - INTERVAL '30 seconds'
    AND connection_status = 'connected';
END;
$$;
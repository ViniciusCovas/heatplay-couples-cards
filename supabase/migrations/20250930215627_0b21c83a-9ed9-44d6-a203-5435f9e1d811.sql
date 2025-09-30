-- Fix search_path security issue for RPC functions
-- Using SET search_path = '' for maximum security

DROP FUNCTION IF EXISTS public.create_room_and_join(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.join_room_by_code(TEXT);
DROP FUNCTION IF EXISTS public.consume_credit_for_room(TEXT);
DROP FUNCTION IF EXISTS public.sync_game_state_reliably(UUID);

-- Create room and join (secure version)
CREATE FUNCTION public.create_room_and_join(
  level_param INTEGER DEFAULT 1,
  selected_language_param VARCHAR DEFAULT 'en'
)
RETURNS TABLE(id UUID, room_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  INSERT INTO public.game_rooms (room_code, level, status, host_user_id, selected_language, credit_status)
  VALUES (v_code, COALESCE(level_param, 1), 'waiting', auth.uid(), COALESCE(selected_language_param, 'en'), 'pending_credit')
  RETURNING public.game_rooms.id INTO v_id;
  
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_id, auth.uid(), true, 1);
  
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- Join room by code (secure version)
CREATE FUNCTION public.join_room_by_code(room_code_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room_id UUID;
  v_status TEXT;
  v_existing RECORD;
  v_participant_count INTEGER;
BEGIN
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  room_code_param := upper(trim(room_code_param));
  
  SELECT id, status INTO v_room_id, v_status
  FROM public.game_rooms
  WHERE room_code = room_code_param AND status IN ('waiting', 'playing')
  LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  SELECT * INTO v_existing
  FROM public.room_participants
  WHERE room_id = v_room_id AND player_id = auth.uid()
  LIMIT 1;
  
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'player_number', v_existing.player_number, 'already_joined', true);
  END IF;
  
  SELECT COUNT(*) INTO v_participant_count FROM public.room_participants WHERE room_id = v_room_id;
  
  IF v_participant_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;
  
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_room_id, auth.uid(), true, CASE WHEN v_participant_count = 0 THEN 1 ELSE 2 END);
  
  RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'player_number', CASE WHEN v_participant_count = 0 THEN 1 ELSE 2 END, 'already_joined', false);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'join_failed', 'details', SQLERRM);
END;
$$;

-- Consume credit (secure version)
CREATE FUNCTION public.consume_credit_for_room(room_code_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
  target_room_id UUID;
BEGIN
  SELECT balance INTO current_balance FROM public.credits WHERE user_id = auth.uid() FOR UPDATE;
  
  IF current_balance < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', COALESCE(current_balance, 0));
  END IF;
  
  SELECT id INTO target_room_id FROM public.game_rooms
  WHERE room_code = room_code_param AND host_user_id = auth.uid() AND credit_status = 'pending_credit';
  
  IF target_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found_or_not_owned');
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.game_rooms WHERE id = target_room_id AND credit_status = 'active_session') THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_already_active');
  END IF;
  
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (auth.uid(), target_room_id, 1, 'active')
  RETURNING * INTO session_record;
  
  UPDATE public.credits SET balance = balance - 1, total_consumed = total_consumed + 1, updated_at = now()
  WHERE user_id = auth.uid();
  
  UPDATE public.game_rooms SET status = 'playing', credit_status = 'active_session', session_id = session_record.id,
      started_at = now(), current_phase = 'proximity-selection'
  WHERE id = target_room_id;
  
  RETURN jsonb_build_object('success', true, 'session_id', session_record.id, 'new_balance', current_balance - 1, 'room_id', target_room_id);
END;
$$;

-- Sync connection state (secure version)
CREATE FUNCTION public.sync_game_state_reliably(room_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  room_exists BOOLEAN;
  participant_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.game_rooms WHERE id = room_id_param AND status IN ('waiting', 'playing')) INTO room_exists;
  
  IF NOT room_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.room_participants WHERE room_id = room_id_param AND player_id = auth.uid()) INTO participant_exists;
  
  IF NOT participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, auth.uid(), 'connected', NOW())
  ON CONFLICT (room_id, player_id)
  DO UPDATE SET connection_status = 'connected', last_ping = NOW(), updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'room_id', room_id_param, 'player_id', auth.uid(), 'timestamp', NOW());
END;
$$;
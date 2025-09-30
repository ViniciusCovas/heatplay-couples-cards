-- ============================================
-- CLEAN DATABASE RESET MIGRATION
-- This drops problematic tables and rebuilds with proper RLS
-- Questions and Levels are preserved
-- ============================================

-- Drop problematic tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.game_flow_queue CASCADE;
DROP TABLE IF EXISTS public.ai_analyses CASCADE;
DROP TABLE IF EXISTS public.game_sync CASCADE;
DROP TABLE IF EXISTS public.connection_states CASCADE;
DROP TABLE IF EXISTS public.level_selection_votes CASCADE;
DROP TABLE IF EXISTS public.game_responses CASCADE;
DROP TABLE IF EXISTS public.room_participants CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.game_rooms CASCADE;

-- ============================================
-- CORE TABLES: Rebuilt from scratch
-- ============================================

-- Game rooms table (clean structure)
CREATE TABLE public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Game configuration
  level INTEGER NOT NULL DEFAULT 1,
  selected_language VARCHAR(10) NOT NULL DEFAULT 'en',
  
  -- Room status
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_phase TEXT NOT NULL DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'proximity-selection', 'level-selection', 'card-display', 'response', 'evaluation', 'finished')),
  
  -- Credit system
  credit_status TEXT NOT NULL DEFAULT 'pending_credit' CHECK (credit_status IN ('pending_credit', 'active_session')),
  session_id UUID,
  
  -- Current game state
  current_card TEXT,
  current_card_index INTEGER DEFAULT 0,
  used_cards TEXT[] DEFAULT '{}',
  current_turn TEXT DEFAULT 'player1' CHECK (current_turn IN ('player1', 'player2')),
  
  -- Proximity responses
  proximity_question_answered BOOLEAN DEFAULT false,
  player1_proximity_response BOOLEAN,
  player2_proximity_response BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  CONSTRAINT valid_current_card CHECK (current_card IS NULL OR current_card ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Room participants (simplified)
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  player_name TEXT,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(room_id, player_id),
  UNIQUE(room_id, player_number)
);

-- Enable RLS
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Game responses
CREATE TABLE public.game_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  response TEXT,
  response_time INTEGER,
  evaluation TEXT,
  evaluation_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_reasoning TEXT,
  selection_method TEXT DEFAULT 'random',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_card_id CHECK (card_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'),
  CONSTRAINT no_self_evaluation CHECK (evaluation_by IS NULL OR evaluation_by != player_id)
);

-- Enable RLS
ALTER TABLE public.game_responses ENABLE ROW LEVEL SECURITY;

-- Level selection votes
CREATE TABLE public.level_selection_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(room_id, player_id)
);

-- Enable RLS
ALTER TABLE public.level_selection_votes ENABLE ROW LEVEL SECURITY;

-- Connection states
CREATE TABLE public.connection_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected')),
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(room_id, player_id)
);

-- Enable RLS
ALTER TABLE public.connection_states ENABLE ROW LEVEL SECURITY;

-- Game sync events
CREATE TABLE public.game_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  triggered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_sync ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Authenticated Users Only)
-- ============================================

-- Game Rooms Policies
CREATE POLICY "Users can create rooms"
  ON public.game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can view their rooms"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Participants can view their rooms"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_rooms.id AND player_id = auth.uid()
  ));

CREATE POLICY "Hosts can update their rooms"
  ON public.game_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- Room Participants Policies
CREATE POLICY "Participants can view room participants"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = room_participants.room_id AND rp.player_id = auth.uid()
  ));

CREATE POLICY "Users can update their own participation"
  ON public.room_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "Users can remove themselves from rooms"
  ON public.room_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = player_id);

-- Sessions Policies
CREATE POLICY "Users can view their sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Game Responses Policies
CREATE POLICY "Participants can view room responses"
  ON public.game_responses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_responses.room_id AND player_id = auth.uid()
  ));

CREATE POLICY "Users can create responses"
  ON public.game_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id AND EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_responses.room_id AND player_id = auth.uid()
  ));

CREATE POLICY "Users can update responses for evaluation"
  ON public.game_responses FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_responses.room_id AND player_id = auth.uid()
  ));

-- Level Selection Votes Policies
CREATE POLICY "Participants can view votes"
  ON public.level_selection_votes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = level_selection_votes.room_id AND player_id = auth.uid()
  ));

CREATE POLICY "Users can manage their votes"
  ON public.level_selection_votes FOR ALL
  TO authenticated
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- Connection States Policies
CREATE POLICY "Participants can view connection states"
  ON public.connection_states FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = connection_states.room_id AND player_id = auth.uid()
  ));

CREATE POLICY "Users can manage their connection state"
  ON public.connection_states FOR ALL
  TO authenticated
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- Game Sync Policies
CREATE POLICY "Participants can view sync events"
  ON public.game_sync FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_sync.room_id AND player_id = auth.uid()
  ));

CREATE POLICY "Participants can create sync events"
  ON public.game_sync FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = triggered_by AND EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = game_sync.room_id AND player_id = auth.uid()
  ));

-- ============================================
-- ESSENTIAL RPC FUNCTIONS
-- ============================================

-- Create room and join (atomic operation)
CREATE OR REPLACE FUNCTION public.create_room_and_join(
  level_param INTEGER DEFAULT 1,
  selected_language_param VARCHAR DEFAULT 'en'
)
RETURNS TABLE(id UUID, room_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  -- Generate 6-character room code
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  -- Create room
  INSERT INTO public.game_rooms (
    room_code,
    level,
    status,
    host_user_id,
    selected_language,
    credit_status
  ) VALUES (
    v_code,
    COALESCE(level_param, 1),
    'waiting',
    auth.uid(),
    COALESCE(selected_language_param, 'en'),
    'pending_credit'
  )
  RETURNING public.game_rooms.id INTO v_id;
  
  -- Add creator as player 1
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_id, auth.uid(), true, 1);
  
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- Join room by code
CREATE OR REPLACE FUNCTION public.join_room_by_code(
  room_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_status TEXT;
  v_existing RECORD;
  v_participant_count INTEGER;
BEGIN
  -- Validate input
  IF room_code_param IS NULL OR trim(room_code_param) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  
  -- Normalize code
  room_code_param := upper(trim(room_code_param));
  
  -- Find room
  SELECT id, status INTO v_room_id, v_status
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND status IN ('waiting', 'playing')
  LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Check if already a participant
  SELECT * INTO v_existing
  FROM public.room_participants
  WHERE room_id = v_room_id AND player_id = auth.uid()
  LIMIT 1;
  
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'room_id', v_room_id,
      'player_number', v_existing.player_number,
      'already_joined', true
    );
  END IF;
  
  -- Check room capacity
  SELECT COUNT(*) INTO v_participant_count
  FROM public.room_participants
  WHERE room_id = v_room_id;
  
  IF v_participant_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_full');
  END IF;
  
  -- Assign player number (2 if player 1 exists, else 1)
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (
    v_room_id,
    auth.uid(),
    true,
    CASE WHEN v_participant_count = 0 THEN 1 ELSE 2 END
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_room_id,
    'player_number', CASE WHEN v_participant_count = 0 THEN 1 ELSE 2 END,
    'already_joined', false
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'join_failed', 'details', SQLERRM);
END;
$$;

-- Consume credit and start game
CREATE OR REPLACE FUNCTION public.consume_credit_for_room(
  room_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
  target_room_id UUID;
BEGIN
  -- Lock user's credits
  SELECT balance INTO current_balance
  FROM public.credits
  WHERE user_id = auth.uid()
  FOR UPDATE;
  
  -- Check balance
  IF current_balance < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', COALESCE(current_balance, 0));
  END IF;
  
  -- Find room
  SELECT id INTO target_room_id
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND host_user_id = auth.uid()
    AND credit_status = 'pending_credit';
  
  IF target_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found_or_not_owned');
  END IF;
  
  -- Check if already has active session
  IF EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = target_room_id AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_already_active');
  END IF;
  
  -- Create session
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (auth.uid(), target_room_id, 1, 'active')
  RETURNING * INTO session_record;
  
  -- Update credits
  UPDATE public.credits
  SET balance = balance - 1, total_consumed = total_consumed + 1, updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Update room to playing
  UPDATE public.game_rooms
  SET status = 'playing', credit_status = 'active_session', session_id = session_record.id,
      started_at = now(), current_phase = 'proximity-selection'
  WHERE id = target_room_id;
  
  RETURN jsonb_build_object('success', true, 'session_id', session_record.id,
                            'new_balance', current_balance - 1, 'room_id', target_room_id);
END;
$$;

-- Sync connection state
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(
  room_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_exists BOOLEAN;
  participant_exists BOOLEAN;
BEGIN
  -- Check room
  SELECT EXISTS(
    SELECT 1 FROM public.game_rooms
    WHERE id = room_id_param AND status IN ('waiting', 'playing')
  ) INTO room_exists;
  
  IF NOT room_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Check participation
  SELECT EXISTS(
    SELECT 1 FROM public.room_participants
    WHERE room_id = room_id_param AND player_id = auth.uid()
  ) INTO participant_exists;
  
  IF NOT participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Update connection
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, auth.uid(), 'connected', NOW())
  ON CONFLICT (room_id, player_id)
  DO UPDATE SET connection_status = 'connected', last_ping = NOW(), updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'room_id', room_id_param, 'player_id', auth.uid(), 'timestamp', NOW());
END;
$$;

-- Enable realtime for essential tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sync;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_states;
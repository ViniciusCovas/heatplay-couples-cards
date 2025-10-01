-- ============================================
-- COMPLETE RLS POLICY RESET
-- This migration removes ALL existing RLS policies
-- and creates new, simple, non-recursive policies
-- ============================================

-- Step 1: DROP ALL EXISTING RLS POLICIES
-- ============================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop all policies on credits
DROP POLICY IF EXISTS "Users can view their own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.credits;

-- Drop all policies on game_rooms
DROP POLICY IF EXISTS "Anyone can view rooms they participate in" ON public.game_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room hosts can update their rooms" ON public.game_rooms;

-- Drop all policies on room_participants
DROP POLICY IF EXISTS "Anyone can view participants in their rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can join open rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Participants can update their own data" ON public.room_participants;

-- Drop all policies on game_responses
DROP POLICY IF EXISTS "Participants can view responses in their rooms" ON public.game_responses;
DROP POLICY IF EXISTS "Participants can submit responses" ON public.game_responses;
DROP POLICY IF EXISTS "Participants can update responses for evaluation" ON public.game_responses;

-- Drop all policies on game_sync
DROP POLICY IF EXISTS "Participants can view sync events in their rooms" ON public.game_sync;
DROP POLICY IF EXISTS "Participants can create sync events" ON public.game_sync;

-- Drop all policies on connection_states
DROP POLICY IF EXISTS "Participants can view connection states in their rooms" ON public.connection_states;
DROP POLICY IF EXISTS "Participants can update their connection state" ON public.connection_states;
DROP POLICY IF EXISTS "Participants can update their own connection" ON public.connection_states;

-- Drop all policies on level_selection_votes
DROP POLICY IF EXISTS "Participants can view votes in their rooms" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Participants can submit votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Participants can update their votes" ON public.level_selection_votes;

-- Drop all policies on questions
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

-- Drop all policies on levels
DROP POLICY IF EXISTS "Anyone can view active levels" ON public.levels;

-- Drop all policies on sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;

-- Drop all policies on ai_analyses
DROP POLICY IF EXISTS "Participants can view analyses for their rooms" ON public.ai_analyses;


-- Step 2: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- PROFILES: Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- CREDITS: Users can only access their own credits
CREATE POLICY "Users can view own credits"
  ON public.credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own credits"
  ON public.credits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- GAME_ROOMS: Authenticated users can access rooms they host
CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Users can view rooms they host"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (host_user_id = auth.uid());

CREATE POLICY "Users can update rooms they host"
  ON public.game_rooms FOR UPDATE
  TO authenticated
  USING (host_user_id = auth.uid());

-- ROOM_PARTICIPANTS: Authenticated users can manage their participation
CREATE POLICY "Authenticated users can join rooms"
  ON public.room_participants FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (auth.uid())::text);

CREATE POLICY "Users can view their own participation"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (player_id = (auth.uid())::text);

CREATE POLICY "Users can update their own participation"
  ON public.room_participants FOR UPDATE
  TO authenticated
  USING (player_id = (auth.uid())::text);

-- GAME_RESPONSES: Authenticated users only
CREATE POLICY "Authenticated users can submit responses"
  ON public.game_responses FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (auth.uid())::text);

CREATE POLICY "Authenticated users can view their responses"
  ON public.game_responses FOR SELECT
  TO authenticated
  USING (player_id = (auth.uid())::text OR evaluation_by = (auth.uid())::text);

CREATE POLICY "Authenticated users can update responses"
  ON public.game_responses FOR UPDATE
  TO authenticated
  USING (player_id = (auth.uid())::text OR evaluation_by = (auth.uid())::text);

-- GAME_SYNC: Authenticated users only
CREATE POLICY "Authenticated users can create sync events"
  ON public.game_sync FOR INSERT
  TO authenticated
  WITH CHECK (triggered_by = (auth.uid())::text);

CREATE POLICY "Authenticated users can view sync events"
  ON public.game_sync FOR SELECT
  TO authenticated
  USING (triggered_by = (auth.uid())::text);

-- CONNECTION_STATES: Authenticated users only
CREATE POLICY "Authenticated users can manage their connection"
  ON public.connection_states FOR INSERT
  TO authenticated
  WITH CHECK (player_id = (auth.uid())::text);

CREATE POLICY "Authenticated users can view their connection"
  ON public.connection_states FOR SELECT
  TO authenticated
  USING (player_id = (auth.uid())::text);

CREATE POLICY "Authenticated users can update their connection"
  ON public.connection_states FOR UPDATE
  TO authenticated
  USING (player_id = (auth.uid())::text);

-- LEVEL_SELECTION_VOTES: Authenticated users only
CREATE POLICY "Authenticated users can submit votes"
  ON public.level_selection_votes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Authenticated users can view their votes"
  ON public.level_selection_votes FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Authenticated users can update their votes"
  ON public.level_selection_votes FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid());

-- QUESTIONS: Public read-only access
CREATE POLICY "Anyone can view active questions"
  ON public.questions FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- LEVELS: Public read-only access  
CREATE POLICY "Anyone can view active levels"
  ON public.levels FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- SESSIONS: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- AI_ANALYSES: Users can view analyses (simplified)
CREATE POLICY "Authenticated users can view analyses"
  ON public.ai_analyses FOR SELECT
  TO authenticated
  USING (true);
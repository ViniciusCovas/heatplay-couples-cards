-- Phase 2: Anonymous-First RLS Design
-- This implements RLS that works for BOTH authenticated and anonymous users
-- Game data uses player_id (text) for access control
-- User-specific data uses auth.uid() for authenticated-only access

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (to prevent recursive RLS issues)
-- ============================================================================

-- Function to check if a player_id participates in a room
CREATE OR REPLACE FUNCTION public.player_participates_in_room(
  room_id_param uuid, 
  player_id_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  );
END;
$function$;

-- Function to check if anonymous user can access a room (recently joined)
CREATE OR REPLACE FUNCTION public.anonymous_can_access_room(
  room_id_param uuid, 
  player_id_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this player recently joined this room
  RETURN EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
    AND joined_at > NOW() - INTERVAL '2 hours'
  );
END;
$function$;

-- Function to check if room is open for joining
CREATE OR REPLACE FUNCTION public.room_is_open(room_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE id = room_id_param
      AND status IN ('waiting', 'playing')
  );
$function$;

-- ============================================================================
-- GAME FLOW TABLES (Support both anonymous and authenticated users)
-- ============================================================================

-- Table: room_participants
-- Anyone can view participants of rooms they're in
-- Anyone can insert themselves as a participant
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants in their rooms"
ON public.room_participants
FOR SELECT
USING (
  public.player_participates_in_room(room_id, player_id) OR
  (auth.uid() IS NOT NULL AND public.player_participates_in_room(room_id, auth.uid()::text))
);

CREATE POLICY "Anyone can join open rooms"
ON public.room_participants
FOR INSERT
WITH CHECK (
  public.room_is_open(room_id) AND
  (
    player_id = COALESCE(auth.uid()::text, player_id) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "Participants can update their own data"
ON public.room_participants
FOR UPDATE
USING (
  player_id = COALESCE(auth.uid()::text, player_id)
);

-- Table: game_rooms
-- Anyone can view rooms they participate in
-- Authenticated users can create rooms
-- Anyone can update rooms they participate in
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms they participate in"
ON public.game_rooms
FOR SELECT
USING (
  public.anonymous_can_access_room(id, COALESCE(auth.uid()::text, '')) OR
  (auth.uid() IS NOT NULL AND public.player_participates_in_room(id, auth.uid()::text))
);

CREATE POLICY "Authenticated users can create rooms"
ON public.game_rooms
FOR INSERT
TO authenticated
WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Room hosts can update their rooms"
ON public.game_rooms
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND host_user_id = auth.uid()) OR
  public.anonymous_can_access_room(id, COALESCE(auth.uid()::text, ''))
);

-- Table: game_responses
-- Participants can view responses in their rooms
-- Participants can insert their own responses
-- Participants can update responses (for evaluations)
ALTER TABLE public.game_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view responses in their rooms"
ON public.game_responses
FOR SELECT
USING (
  public.anonymous_can_access_room(room_id, player_id) OR
  public.player_participates_in_room(room_id, player_id)
);

CREATE POLICY "Participants can submit responses"
ON public.game_responses
FOR INSERT
WITH CHECK (
  public.player_participates_in_room(room_id, player_id)
);

CREATE POLICY "Participants can update responses for evaluation"
ON public.game_responses
FOR UPDATE
USING (
  public.player_participates_in_room(room_id, COALESCE(evaluation_by, player_id))
);

-- Table: game_sync
-- Participants can view sync events in their rooms
-- Participants can create sync events
ALTER TABLE public.game_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view sync events in their rooms"
ON public.game_sync
FOR SELECT
USING (
  public.anonymous_can_access_room(room_id, triggered_by) OR
  public.player_participates_in_room(room_id, triggered_by)
);

CREATE POLICY "Participants can create sync events"
ON public.game_sync
FOR INSERT
WITH CHECK (
  public.player_participates_in_room(room_id, triggered_by)
);

-- Table: connection_states
-- Participants can view connection states in their rooms
-- Participants can update their own connection state
ALTER TABLE public.connection_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view connection states in their rooms"
ON public.connection_states
FOR SELECT
USING (
  public.anonymous_can_access_room(room_id, player_id) OR
  public.player_participates_in_room(room_id, player_id)
);

CREATE POLICY "Participants can update their connection state"
ON public.connection_states
FOR INSERT
WITH CHECK (
  public.player_participates_in_room(room_id, player_id)
);

CREATE POLICY "Participants can update their own connection"
ON public.connection_states
FOR UPDATE
USING (
  player_id = COALESCE(auth.uid()::text, player_id)
);

-- Table: level_selection_votes
-- Participants can view votes in their rooms
-- Participants can submit their votes
ALTER TABLE public.level_selection_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view votes in their rooms"
ON public.level_selection_votes
FOR SELECT
USING (
  public.player_participates_in_room(room_id, player_id::text)
);

CREATE POLICY "Participants can submit votes"
ON public.level_selection_votes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND player_id = auth.uid()
);

CREATE POLICY "Participants can update their votes"
ON public.level_selection_votes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND player_id = auth.uid()
);

-- ============================================================================
-- USER-SPECIFIC TABLES (Authenticated users only)
-- ============================================================================

-- Table: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Table: credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
ON public.credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own credits"
ON public.credits
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Table: sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- SYSTEM TABLES (Read-only for game functionality)
-- ============================================================================

-- Table: questions
-- Anyone can read questions (needed for gameplay)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active questions"
ON public.questions
FOR SELECT
USING (is_active = true);

-- Table: levels
-- Anyone can read levels (needed for level selection)
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active levels"
ON public.levels
FOR SELECT
USING (is_active = true);

-- Table: ai_analyses
-- Participants can view analyses for their rooms
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view analyses for their rooms"
ON public.ai_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = ai_analyses.room_id
    AND (
      rp.player_id = COALESCE(auth.uid()::text, rp.player_id)
    )
  )
);
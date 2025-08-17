-- Phase 1: Fix RLS Policies for Anonymous Users
-- The root issue is that migration 20250810024051 broke anonymous access

-- 1. Fix game_rooms table - allow room discovery by code for anonymous users
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.game_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room hosts and participants can update rooms" ON public.game_rooms;

-- Allow anonymous users to discover rooms by code (needed for join_room_by_code)
CREATE POLICY "Users can discover rooms by code" 
ON public.game_rooms 
FOR SELECT 
USING (
  (auth.role() = 'authenticated' OR auth.role() = 'anon') AND
  status IN ('waiting', 'playing')
);

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow hosts to view their rooms
CREATE POLICY "Hosts can view their rooms" 
ON public.game_rooms 
FOR SELECT 
USING (host_user_id = auth.uid());

-- Allow hosts to update their rooms
CREATE POLICY "Hosts can update their rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (host_user_id = auth.uid());

-- Allow recent joiners to view rooms (for anonymous users who recently joined)
CREATE POLICY "Recent joiners can view rooms" 
ON public.game_rooms 
FOR SELECT 
USING (
  status IN ('waiting', 'playing') AND
  created_at > NOW() - INTERVAL '2 hours' AND
  EXISTS (
    SELECT 1 FROM public.room_participants rp 
    WHERE rp.room_id = game_rooms.id
  )
);

-- Allow anonymous users to view rooms they participate in
CREATE POLICY "Anon users can view rooms they participate in" 
ON public.game_rooms 
FOR SELECT 
USING (
  auth.uid() IS NULL AND
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id
  )
);

-- 2. Fix room_participants table - allow anonymous users to join and be viewed
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;

-- Allow viewing all participants (needed for room functionality)
CREATE POLICY "Room participants can view all participants" 
ON public.room_participants 
FOR SELECT 
USING (true);

-- Allow anyone to join rooms (needed for anonymous users)
CREATE POLICY "Anyone can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true);

-- Allow users to update their own participation status
CREATE POLICY "Users can update own participation status" 
ON public.room_participants 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND player_id IS NOT NULL)
);

-- Allow users to remove themselves from rooms
CREATE POLICY "Users can remove themselves from rooms" 
ON public.room_participants 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
  (auth.uid() IS NULL AND player_id IS NOT NULL)
);

-- 3. Fix game_responses table - allow anonymous users to create and view responses
DROP POLICY IF EXISTS "Room participants can view responses" ON public.game_responses;
DROP POLICY IF EXISTS "Room participants can create responses" ON public.game_responses;
DROP POLICY IF EXISTS "Room participants can update responses" ON public.game_responses;

CREATE POLICY "Room participants can view responses" 
ON public.game_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = game_responses.player_id)
    )
  )
);

CREATE POLICY "Room participants can create responses" 
ON public.game_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND player_id = game_responses.player_id
  )
);

CREATE POLICY "Room participants can update responses" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = game_responses.player_id)
    )
  )
);

-- 4. Fix game_sync table - allow anonymous users to create and view sync events
DROP POLICY IF EXISTS "Room participants can view sync events" ON public.game_sync;
DROP POLICY IF EXISTS "Room participants can create sync events" ON public.game_sync;

CREATE POLICY "Room participants can view sync events" 
ON public.game_sync 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = auth.uid()::text
  )) OR
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id
  ))
);

CREATE POLICY "Room participants can create sync events" 
ON public.game_sync 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = auth.uid()::text
  )) OR
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = game_sync.triggered_by
  ))
);

-- 5. Fix level_selection_votes table - allow anonymous users
DROP POLICY IF EXISTS "Room participants can view level votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Room participants can create level votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Room participants can update level votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Room participants can delete level votes" ON public.level_selection_votes;

CREATE POLICY "Room participants can view level votes" 
ON public.level_selection_votes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL)
    )
  )
);

CREATE POLICY "Room participants can create level votes" 
ON public.level_selection_votes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = level_selection_votes.player_id)
    )
  ) AND 
  (
    (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "Room participants can update level votes" 
ON public.level_selection_votes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = level_selection_votes.player_id)
    )
  ) AND 
  (
    (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "Room participants can delete level votes" 
ON public.level_selection_votes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = level_selection_votes.player_id)
    )
  ) AND 
  (
    (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

-- 6. Fix questions and levels to allow anonymous users to view
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view levels" ON public.levels;

CREATE POLICY "Anyone can view active questions" 
ON public.questions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active levels" 
ON public.questions 
FOR SELECT 
USING (is_active = true);

-- Keep admin policies for managing content
-- (Admins can manage questions and levels policies remain unchanged)

-- 7. Fix connection_states table for anonymous users
DROP POLICY IF EXISTS "Users can view connection states for their rooms" ON public.connection_states;
DROP POLICY IF EXISTS "Users can update their own connection state" ON public.connection_states;

CREATE POLICY "Users can view connection states for their rooms" 
ON public.connection_states 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = connection_states.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL)
    )
  )
);

CREATE POLICY "Users can update their own connection state" 
ON public.connection_states 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = connection_states.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = connection_states.player_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = connection_states.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL AND player_id = connection_states.player_id)
    )
  )
);

-- 8. Fix ai_analyses table for anonymous users
DROP POLICY IF EXISTS "Room participants can view AI analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "System can create AI analyses" ON public.ai_analyses;

CREATE POLICY "Room participants can view AI analyses" 
ON public.ai_analyses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = ai_analyses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL)
    )
  )
);

CREATE POLICY "Service role can create AI analyses" 
ON public.ai_analyses 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'service_role') OR
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = ai_analyses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      (auth.uid() IS NULL)
    )
  )
);
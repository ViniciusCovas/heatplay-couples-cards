-- Phase 1: Critical Game Data Protection - Room-Based Access Control

-- 1. Secure game_rooms table - users can only access rooms they participate in
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can create game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can update game rooms" ON public.game_rooms;

CREATE POLICY "Users can view rooms they participate in" 
ON public.game_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id 
    AND player_id = auth.uid()::text
  )
  OR host_user_id = auth.uid()
);

CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Room hosts and participants can update rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (
  host_user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id 
    AND player_id = auth.uid()::text
  )
);

-- 2. Secure game_responses table - only room participants can access
DROP POLICY IF EXISTS "Anyone can view game responses" ON public.game_responses;
DROP POLICY IF EXISTS "Anyone can create game responses" ON public.game_responses;
DROP POLICY IF EXISTS "Anyone can update game responses" ON public.game_responses;

CREATE POLICY "Room participants can view responses" 
ON public.game_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND player_id = auth.uid()::text
  )
);

CREATE POLICY "Room participants can create responses" 
ON public.game_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND player_id = auth.uid()::text
  )
  AND player_id = auth.uid()::text
);

CREATE POLICY "Room participants can update responses" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_responses.room_id 
    AND player_id = auth.uid()::text
  )
);

-- 3. Secure game_sync table - only room participants can access
DROP POLICY IF EXISTS "Anyone can view game sync" ON public.game_sync;
DROP POLICY IF EXISTS "Anyone can create game sync" ON public.game_sync;

CREATE POLICY "Room participants can view sync events" 
ON public.game_sync 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = auth.uid()::text
  )
);

CREATE POLICY "Room participants can create sync events" 
ON public.game_sync 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = auth.uid()::text
  )
);

-- 4. Secure ai_analyses table - only room participants can access
DROP POLICY IF EXISTS "Anyone can view AI analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "Anyone can create AI analyses" ON public.ai_analyses;

CREATE POLICY "Room participants can view AI analyses" 
ON public.ai_analyses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = ai_analyses.room_id 
    AND player_id = auth.uid()::text
  )
);

CREATE POLICY "System can create AI analyses" 
ON public.ai_analyses 
FOR INSERT 
WITH CHECK (true); -- Allow system/edge functions to create analyses

-- 5. Secure room_participants table - users can only see participants of their rooms
DROP POLICY IF EXISTS "Anyone can view room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can create room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can update room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can delete room participants" ON public.room_participants;

CREATE POLICY "Users can view participants in their rooms" 
ON public.room_participants 
FOR SELECT 
USING (
  player_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.player_id = auth.uid()::text
  )
);

CREATE POLICY "Users can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (player_id = auth.uid()::text);

CREATE POLICY "Users can update their own participation" 
ON public.room_participants 
FOR UPDATE 
USING (player_id = auth.uid()::text);

CREATE POLICY "Users can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (player_id = auth.uid()::text);

-- 6. Secure level_selection_votes table - only room participants
DROP POLICY IF EXISTS "Anyone can view level selection votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Anyone can create level selection votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Anyone can update level selection votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Anyone can delete level selection votes" ON public.level_selection_votes;

CREATE POLICY "Room participants can view level votes" 
ON public.level_selection_votes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND player_id = auth.uid()::text
  )
);

CREATE POLICY "Room participants can create level votes" 
ON public.level_selection_votes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND player_id = auth.uid()::text
  )
  AND player_id = auth.uid()::text
);

CREATE POLICY "Room participants can update level votes" 
ON public.level_selection_votes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND player_id = auth.uid()::text
  )
  AND player_id = auth.uid()::text
);

CREATE POLICY "Room participants can delete level votes" 
ON public.level_selection_votes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = level_selection_votes.room_id 
    AND player_id = auth.uid()::text
  )
  AND player_id = auth.uid()::text
);

-- 7. Content Protection - Secure questions and levels tables
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can create questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can update questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can delete questions" ON public.questions;

CREATE POLICY "Authenticated users can view questions" 
ON public.questions 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage questions" 
ON public.questions 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

DROP POLICY IF EXISTS "Anyone can view levels" ON public.levels;
DROP POLICY IF EXISTS "Anyone can create levels" ON public.levels;
DROP POLICY IF EXISTS "Anyone can update levels" ON public.levels;
DROP POLICY IF EXISTS "Anyone can delete levels" ON public.levels;

CREATE POLICY "Authenticated users can view levels" 
ON public.levels 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage levels" 
ON public.levels 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

-- 8. Fix database functions security settings
CREATE OR REPLACE FUNCTION public.get_random_questions_for_level(level_id_param uuid, language_param character varying DEFAULT 'en'::character varying, limit_param integer DEFAULT 10)
 RETURNS TABLE(id uuid, text text, category text, level_id uuid, language character varying, created_at timestamp with time zone, updated_at timestamp with time zone, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.category, q.level_id, q.language, q.created_at, q.updated_at, q.is_active
  FROM public.questions q
  WHERE q.level_id = level_id_param 
    AND q.language = language_param 
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT limit_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credit(room_id_param uuid, user_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  session_record RECORD;
BEGIN
  -- Lock the user's credits row
  SELECT balance INTO current_balance
  FROM public.credits 
  WHERE user_id = user_id_param
  FOR UPDATE;
  
  -- Check if user has credits
  IF current_balance < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', COALESCE(current_balance, 0)
    );
  END IF;
  
  -- Check if room already has an active session
  IF EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'session_already_active'
    );
  END IF;
  
  -- Create session record
  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status)
  VALUES (user_id_param, room_id_param, 1, 'active')
  RETURNING * INTO session_record;
  
  -- Update credits
  UPDATE public.credits 
  SET 
    balance = balance - 1,
    total_consumed = total_consumed + 1,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Update room status
  UPDATE public.game_rooms 
  SET 
    credit_status = 'active_session',
    session_id = session_record.id,
    host_user_id = user_id_param
  WHERE id = room_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', session_record.id,
    'new_balance', current_balance - 1
  );
END;
$function$;
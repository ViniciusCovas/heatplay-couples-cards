-- Critical Security Fixes Migration
-- Phase 1: Fix RLS Policy Infinite Recursion for room_participants

-- Create security definer function to check room participation
CREATE OR REPLACE FUNCTION public.user_participates_in_room(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = user_id_param::text
  );
END;
$$;

-- Drop existing problematic policies for room_participants
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;

-- Create new secure policy for SELECT without recursion
CREATE POLICY "Users can view participants in their rooms" 
ON public.room_participants 
FOR SELECT 
USING (
  player_id = (auth.uid())::text 
  OR public.user_participates_in_room(room_id, auth.uid())
);

-- Phase 2: Secure AI Analyses INSERT Policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create AI analyses" ON public.ai_analyses;

-- Create restricted policy for AI analyses
CREATE POLICY "Service role can create AI analyses" 
ON public.ai_analyses 
FOR INSERT 
WITH CHECK (
  -- Only allow inserts from service role or authenticated users who participate in the room
  auth.role() = 'service_role'::text 
  OR EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = ai_analyses.room_id 
    AND player_id = (auth.uid())::text
  )
);

-- Phase 3: Update remaining database functions with search_path
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Make HTTP request to edge function
  PERFORM net.http_post(
    url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
    body := jsonb_build_object(
      'email', NEW.email,
      'user_id', NEW.id::text,
      'created_at', NEW.created_at::text
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_activity(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    last_seen = now(),
    last_login = now(),
    updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_random_questions_for_level(level_id_param uuid, language_param character varying DEFAULT 'en'::character varying, limit_param integer DEFAULT 10)
RETURNS TABLE(id uuid, text text, category text, level_id uuid, language character varying, created_at timestamp with time zone, updated_at timestamp with time zone, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
-- Phase 1: Complete RLS Reset - Drop all policies and disable RLS

-- Drop all policies on connection_states
DROP POLICY IF EXISTS "Participants can view connection states" ON public.connection_states;
DROP POLICY IF EXISTS "Users can manage their connection state" ON public.connection_states;

-- Drop all policies on game_sync
DROP POLICY IF EXISTS "Participants can create sync events" ON public.game_sync;
DROP POLICY IF EXISTS "Participants can view sync events" ON public.game_sync;

-- Drop all policies on levels
DROP POLICY IF EXISTS "Admins can manage levels" ON public.levels;
DROP POLICY IF EXISTS "Anyone can view active levels" ON public.levels;

-- Drop all policies on level_selection_votes
DROP POLICY IF EXISTS "Participants can view votes" ON public.level_selection_votes;
DROP POLICY IF EXISTS "Users can manage their votes" ON public.level_selection_votes;

-- Drop all policies on game_responses
DROP POLICY IF EXISTS "Participants can view room responses" ON public.game_responses;
DROP POLICY IF EXISTS "Users can create responses" ON public.game_responses;
DROP POLICY IF EXISTS "Users can update responses for evaluation" ON public.game_responses;

-- Drop all policies on sessions
DROP POLICY IF EXISTS "Users can view their sessions" ON public.sessions;

-- Drop all policies on game_rooms
DROP POLICY IF EXISTS "Hosts can update their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts can view their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.game_rooms;

-- Drop all policies on credits
DROP POLICY IF EXISTS "Users can insert own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;

-- Drop all policies on questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

-- Drop all policies on room_participants
DROP POLICY IF EXISTS "Participants can view room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Users can remove themselves from rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.room_participants;

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile, admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

-- Drop all policies on ai_analyses
DROP POLICY IF EXISTS "System can insert analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can view analyses for their rooms" ON public.ai_analyses;

-- Disable RLS on all tables
ALTER TABLE public.connection_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sync DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_selection_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses DISABLE ROW LEVEL SECURITY;
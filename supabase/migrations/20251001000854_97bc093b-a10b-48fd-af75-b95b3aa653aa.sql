-- Phase 1: Complete RLS Cleanup
-- This will drop all RLS policies and disable RLS to restore functionality

-- Step 1: Drop all policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 2: Drop all policies on credits table
DROP POLICY IF EXISTS "Users can view their own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.credits;

-- Step 3: Drop all policies on game_rooms table
DROP POLICY IF EXISTS "Users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can update rooms they host" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can view rooms they host" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.game_rooms;

-- Step 4: Disable RLS on all tables that had it enabled
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY;

-- Step 5: Remove the security definer function we created
DROP FUNCTION IF EXISTS public.user_participates_in_room(uuid, uuid);

-- RLS is now completely disabled - app should work for both anonymous and authenticated users
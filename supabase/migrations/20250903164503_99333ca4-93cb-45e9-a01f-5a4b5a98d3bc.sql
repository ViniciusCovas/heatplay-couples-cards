-- Critical Fix: Anonymous User Evaluation Issue
-- Fix RLS policies on game_flow_queue to allow anonymous participants

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Room participants can queue events" ON public.game_flow_queue;
DROP POLICY IF EXISTS "Room participants can view queue events" ON public.game_flow_queue;

-- Create new policies that work for both authenticated and anonymous users
CREATE POLICY "Room participants can queue events (all users)" 
ON public.game_flow_queue 
FOR INSERT 
WITH CHECK (
  -- Allow if authenticated user is a participant
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id 
    AND player_id = auth.uid()::text
  ))
  OR
  -- Allow if anonymous user and triggered_by matches a room participant
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id 
    AND player_id = game_flow_queue.event_data->>'evaluation_by'
  ))
);

CREATE POLICY "Room participants can view queue events (all users)" 
ON public.game_flow_queue 
FOR SELECT 
USING (
  -- Allow if authenticated user is a participant
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id 
    AND player_id = auth.uid()::text
  ))
  OR
  -- Allow anonymous users to view queue events for their rooms
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_flow_queue.room_id
  ))
);

-- Reinstall the missing evaluation trigger
DROP TRIGGER IF EXISTS simple_evaluation_trigger ON public.game_responses;

CREATE TRIGGER simple_evaluation_trigger
  AFTER INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_evaluation_trigger();

-- Clean up the stuck room to test the fix
UPDATE public.game_rooms 
SET current_phase = 'evaluation'
WHERE id = '0887c19e-8df6-4bab-bc8a-695532b61ee6';
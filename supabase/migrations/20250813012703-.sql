-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can discover rooms by code" ON public.game_rooms;

-- Create new policy that allows both authenticated and anonymous users to discover rooms by code
CREATE POLICY "Users can discover rooms by code" 
ON public.game_rooms 
FOR SELECT 
USING (
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
  AND status IN ('waiting', 'playing')
);
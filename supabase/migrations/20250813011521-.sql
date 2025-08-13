-- Add RLS policy to allow room discovery by room code
CREATE POLICY "Authenticated users can discover rooms by code" 
ON public.game_rooms 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND status IN ('waiting', 'playing')
);
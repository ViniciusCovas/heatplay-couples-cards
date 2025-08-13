-- Phase 1: Fix RLS policies for real-time subscriptions

-- Update room_participants RLS to properly support anonymous users viewing participants of rooms they're in
DROP POLICY IF EXISTS "Anon users can view participants of open rooms" ON public.room_participants;

CREATE POLICY "Anon users can view participants of rooms they participate in" 
ON public.room_participants 
FOR SELECT 
USING (
  (auth.uid() IS NULL) AND 
  EXISTS (
    SELECT 1 FROM public.room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.player_id = room_participants.player_id
  )
);

-- Update game_rooms RLS to allow anonymous users to view rooms they participate in
CREATE POLICY "Anon users can view rooms they participate in" 
ON public.game_rooms 
FOR SELECT 
USING (
  (auth.uid() IS NULL) AND 
  EXISTS (
    SELECT 1 FROM public.room_participants rp 
    WHERE rp.room_id = game_rooms.id
  )
);

-- Update game_sync RLS to allow anonymous users to view sync events for rooms they're in
DROP POLICY IF EXISTS "Room participants can view sync events" ON public.game_sync;

CREATE POLICY "Room participants can view sync events" 
ON public.game_sync 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = (auth.uid())::text
  )) OR
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id
  ))
);

-- Allow anonymous users to create sync events for rooms they participate in
DROP POLICY IF EXISTS "Room participants can create sync events" ON public.game_sync;

CREATE POLICY "Room participants can create sync events" 
ON public.game_sync 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = (auth.uid())::text
  )) OR
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = game_sync.room_id 
    AND room_participants.player_id = game_sync.triggered_by
  ))
);
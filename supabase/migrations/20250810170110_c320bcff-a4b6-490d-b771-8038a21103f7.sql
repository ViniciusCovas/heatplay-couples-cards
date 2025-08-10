-- Fix the create_room_and_join function with proper column aliases
CREATE OR REPLACE FUNCTION public.create_room_and_join(level_param integer, selected_language_param character varying DEFAULT 'en'::character varying)
 RETURNS TABLE(id uuid, room_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_code text;
begin
  -- generate a simple 6-char code
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.game_rooms (
    room_code,
    level,
    status,
    created_by,
    credit_status,
    host_user_id,
    selected_language
  ) values (
    v_code,
    coalesce(level_param, 1),
    'waiting',
    auth.uid()::text,
    'pending_credit',
    auth.uid(),
    coalesce(selected_language_param, 'en')
  )
  returning public.game_rooms.id into v_id;

  -- add creator as participant 1
  insert into public.room_participants (room_id, player_id, is_ready, player_number)
  values (v_id, auth.uid()::text, true, 1);

  return query select v_id as id, v_code as room_code;
end;
$function$;

-- Update RLS policies to support hybrid authentication model
-- Allow anonymous users to join rooms by code
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;

-- Room creation requires authentication (for credit system)
CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow anyone to join rooms (anonymous users welcome)
CREATE POLICY "Anyone can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true);

-- Allow room participants to view rooms (including anonymous)
CREATE POLICY "Room participants can view rooms" 
ON public.game_rooms 
FOR SELECT 
USING (
  -- Host can always see their room
  (host_user_id = auth.uid()) OR
  -- Participants can see if they're in the room (supports anonymous)
  (EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id 
    AND (
      -- Authenticated users match by auth.uid()
      (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
      -- Allow anonymous access for room discovery by code
      (auth.uid() IS NULL)
    )
  ))
);

-- Allow room updates for participants
CREATE POLICY "Room participants can update rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (
  -- Host can always update
  (host_user_id = auth.uid()) OR
  -- Participants can update (authenticated only for updates)
  (EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_rooms.id 
    AND player_id = auth.uid()::text
  ))
);

-- Update room_participants policies for hybrid model
CREATE POLICY "Room participants can view each other" 
ON public.room_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND (
      (auth.uid() IS NOT NULL AND rp2.player_id = auth.uid()::text) OR
      (auth.uid() IS NULL) -- Allow anonymous discovery
    )
  )
);

-- Allow participants to update their own records
CREATE POLICY "Participants can update their own records" 
ON public.room_participants 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
  (auth.uid() IS NULL) -- Allow anonymous updates
);

-- Allow participants to leave rooms
CREATE POLICY "Participants can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND player_id = auth.uid()::text) OR
  (auth.uid() IS NULL) -- Allow anonymous to leave
);
-- First, clean up any duplicate participant entries
DELETE FROM public.room_participants 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY room_id, player_number 
             ORDER BY joined_at DESC
           ) as rn
    FROM public.room_participants
  ) t 
  WHERE rn > 1
);

-- Add unique constraint to prevent duplicate player numbers in same room
ALTER TABLE public.room_participants 
ADD CONSTRAINT unique_room_player_number 
UNIQUE (room_id, player_number);

-- Function to safely assign player numbers
CREATE OR REPLACE FUNCTION public.assign_player_number(room_id_param uuid, player_id_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_number integer;
  existing_participants integer;
BEGIN
  -- Lock the room to prevent race conditions
  PERFORM 1 FROM public.game_rooms WHERE id = room_id_param FOR UPDATE;
  
  -- Count existing participants
  SELECT COUNT(*) INTO existing_participants
  FROM public.room_participants 
  WHERE room_id = room_id_param;
  
  -- If room is full, return 0
  IF existing_participants >= 2 THEN
    RETURN 0;
  END IF;
  
  -- Check if player already exists
  SELECT player_number INTO assigned_number
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF assigned_number IS NOT NULL THEN
    RETURN assigned_number;
  END IF;
  
  -- Assign player number based on what's available
  IF existing_participants = 0 THEN
    assigned_number := 1;
  ELSE
    -- Check if player 1 exists
    IF EXISTS (SELECT 1 FROM public.room_participants WHERE room_id = room_id_param AND player_number = 1) THEN
      assigned_number := 2;
    ELSE
      assigned_number := 1;
    END IF;
  END IF;
  
  RETURN assigned_number;
END;
$$;
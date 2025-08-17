-- Create connection_states table for monitoring player connections
CREATE TABLE public.connection_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Enable RLS on connection_states
ALTER TABLE public.connection_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for connection_states
CREATE POLICY "Users can view connection states for their rooms" 
ON public.connection_states 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = connection_states.room_id 
    AND room_participants.player_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own connection state" 
ON public.connection_states 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = connection_states.room_id 
    AND room_participants.player_id = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = connection_states.room_id 
    AND room_participants.player_id = auth.uid()::text
  )
);

-- Create or replace the sync_game_state_reliably function
CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(room_id_param uuid, player_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_room record;
  player_participant record;
BEGIN
  -- Verify player participation
  SELECT * INTO player_participant
  FROM public.room_participants
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF player_participant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Get current room state
  SELECT * INTO current_room
  FROM public.game_rooms
  WHERE id = room_id_param;
  
  IF current_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Update connection state
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', now())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = now(),
    updated_at = now();
  
  -- Return current game state for sync
  RETURN jsonb_build_object(
    'success', true,
    'room_state', to_jsonb(current_room),
    'player_number', player_participant.player_number,
    'connection_updated', true
  );
END;
$function$;

-- Add trigger for updated_at on connection_states
CREATE TRIGGER update_connection_states_updated_at
BEFORE UPDATE ON public.connection_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
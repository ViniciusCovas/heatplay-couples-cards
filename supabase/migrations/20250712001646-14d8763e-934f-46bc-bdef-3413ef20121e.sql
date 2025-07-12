-- Create game_rooms table
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Create room_participants table
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Create game_responses table for storing responses
CREATE TABLE public.game_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  response TEXT,
  response_time INTEGER,
  evaluation TEXT,
  evaluation_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we don't have auth yet)
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create game rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view room participants" 
ON public.room_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create room participants" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update room participants" 
ON public.room_participants 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete room participants" 
ON public.room_participants 
FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view game responses" 
ON public.game_responses 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create game responses" 
ON public.game_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update game responses" 
ON public.game_responses 
FOR UPDATE 
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_responses;

-- Create function to clean up inactive rooms
CREATE OR REPLACE FUNCTION public.cleanup_inactive_rooms()
RETURNS void AS $$
BEGIN
  -- Delete rooms older than 2 hours with no activity
  DELETE FROM public.game_rooms 
  WHERE created_at < now() - INTERVAL '2 hours' 
  AND status = 'waiting';
  
  -- Update last_activity for room cleanup
  UPDATE public.room_participants 
  SET last_activity = now() 
  WHERE last_activity < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
-- Add player_number column to room_participants table
ALTER TABLE public.room_participants 
ADD COLUMN player_number INTEGER CHECK (player_number IN (1, 2));

-- Update existing participants to have player_numbers based on joined_at order
WITH numbered_participants AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY joined_at) as player_num
  FROM public.room_participants
)
UPDATE public.room_participants 
SET player_number = numbered_participants.player_num
FROM numbered_participants 
WHERE public.room_participants.id = numbered_participants.id 
AND numbered_participants.player_num <= 2;

-- Add level_selection_votes table for synchronized level selection
CREATE TABLE public.level_selection_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  selected_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE
);

-- Enable RLS for level_selection_votes
ALTER TABLE public.level_selection_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for level_selection_votes
CREATE POLICY "Anyone can view level selection votes" 
ON public.level_selection_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create level selection votes" 
ON public.level_selection_votes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update level selection votes" 
ON public.level_selection_votes 
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_level_selection_votes_room_id ON public.level_selection_votes(room_id);
CREATE INDEX idx_level_selection_votes_player_id ON public.level_selection_votes(player_id);
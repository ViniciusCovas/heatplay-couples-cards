-- Add game state tracking tables and columns

-- Add game state to game_rooms table
ALTER TABLE public.game_rooms 
ADD COLUMN current_phase TEXT DEFAULT 'proximity-selection',
ADD COLUMN proximity_question_answered BOOLEAN DEFAULT false,
ADD COLUMN proximity_response BOOLEAN DEFAULT null,
ADD COLUMN current_turn TEXT DEFAULT 'player1',
ADD COLUMN current_card TEXT DEFAULT null,
ADD COLUMN current_card_index INTEGER DEFAULT 0,
ADD COLUMN used_cards TEXT[] DEFAULT '{}';

-- Create game_sync table for real-time synchronization
CREATE TABLE public.game_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'proximity_answer', 'card_reveal', 'response_submit', 'evaluation_submit', 'level_change'
  action_data JSONB NOT NULL,
  triggered_by TEXT NOT NULL, -- player_id who triggered the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.game_sync ENABLE ROW LEVEL SECURITY;

-- Create policies for game_sync
CREATE POLICY "Anyone can view game sync" 
ON public.game_sync 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create game sync" 
ON public.game_sync 
FOR INSERT 
WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sync;
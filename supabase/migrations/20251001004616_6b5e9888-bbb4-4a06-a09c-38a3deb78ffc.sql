-- Add unique constraint to connection_states to ensure proper ON CONFLICT handling
CREATE UNIQUE INDEX IF NOT EXISTS connection_states_room_player_unique 
ON public.connection_states(room_id, player_id);
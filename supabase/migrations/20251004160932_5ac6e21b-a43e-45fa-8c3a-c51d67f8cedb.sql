-- Enable RLS on game_flow_queue table
ALTER TABLE public.game_flow_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role (background jobs) to manage the queue
CREATE POLICY "Service role can manage queue" ON public.game_flow_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to view queue items for their rooms
CREATE POLICY "Users can view their room queue" ON public.game_flow_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_participants.room_id = game_flow_queue.room_id
      AND room_participants.player_id = (auth.uid())::text
    )
  );
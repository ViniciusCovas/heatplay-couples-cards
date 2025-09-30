-- Create ai_analyses table for storing AI-generated insights
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  analysis_type text NOT NULL DEFAULT 'getclose-ai-analysis',
  ai_response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_analyses
CREATE POLICY "Users can view analyses for their rooms"
  ON public.ai_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = ai_analyses.room_id
      AND (gr.host_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.room_participants rp
        WHERE rp.room_id = gr.id AND rp.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "System can insert analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ai_analyses_room_id ON public.ai_analyses(room_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON public.ai_analyses(analysis_type);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_analyses;
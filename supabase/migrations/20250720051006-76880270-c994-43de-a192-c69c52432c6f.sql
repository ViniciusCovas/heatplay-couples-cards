
-- Create ai_analyses table for storing AI analysis data
CREATE TABLE public.ai_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('question_selection', 'final_report')),
  input_data JSONB NOT NULL,
  ai_response JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for ai_analyses
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create AI analyses" 
  ON public.ai_analyses 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can view AI analyses" 
  ON public.ai_analyses 
  FOR SELECT 
  USING (true);

-- Add AI reasoning columns to game_responses table
ALTER TABLE public.game_responses 
ADD COLUMN ai_reasoning TEXT,
ADD COLUMN selection_method TEXT DEFAULT 'random' CHECK (selection_method IN ('random', 'ai_intelligent'));

-- Create index for better performance
CREATE INDEX idx_ai_analyses_room_id ON public.ai_analyses(room_id);
CREATE INDEX idx_ai_analyses_type ON public.ai_analyses(analysis_type);
CREATE INDEX idx_game_responses_selection_method ON public.game_responses(selection_method);

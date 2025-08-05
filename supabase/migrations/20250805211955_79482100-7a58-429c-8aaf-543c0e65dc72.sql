-- Update the analysis_type constraint to include 'getclose-ai-analysis'
ALTER TABLE public.ai_analyses 
DROP CONSTRAINT IF EXISTS ai_analyses_analysis_type_check;

ALTER TABLE public.ai_analyses 
ADD CONSTRAINT ai_analyses_analysis_type_check 
CHECK (analysis_type IN ('question_selection', 'final_report', 'getclose-ai-analysis'));
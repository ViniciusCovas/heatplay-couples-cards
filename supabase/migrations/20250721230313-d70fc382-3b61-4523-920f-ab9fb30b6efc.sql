
-- Add metadata columns to questions table for smarter AI selection
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS intensity integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'open_ended';

-- Add constraints for the new columns
ALTER TABLE public.questions 
ADD CONSTRAINT questions_intensity_check CHECK (intensity >= 1 AND intensity <= 5);

-- Create an index for better performance when filtering by category and intensity
CREATE INDEX IF NOT EXISTS idx_questions_metadata ON public.questions(category, intensity, question_type, language, is_active);

-- Update existing questions with basic categorization (we can refine this later)
UPDATE public.questions 
SET 
  category = CASE 
    WHEN text ILIKE '%love%' OR text ILIKE '%feel%' OR text ILIKE '%emotion%' OR text ILIKE '%heart%' THEN 'intimacy'
    WHEN text ILIKE '%attract%' OR text ILIKE '%beautiful%' OR text ILIKE '%sexy%' OR text ILIKE '%desire%' THEN 'attraction'
    WHEN text ILIKE '%honest%' OR text ILIKE '%truth%' OR text ILIKE '%secret%' OR text ILIKE '%confess%' THEN 'honesty'
    WHEN text ILIKE '%surprise%' OR text ILIKE '%unexpected%' OR text ILIKE '%shock%' OR text ILIKE '%amaze%' THEN 'surprise'
    ELSE 'general'
  END,
  intensity = CASE 
    WHEN text ILIKE '%deep%' OR text ILIKE '%intimate%' OR text ILIKE '%vulnerable%' OR text ILIKE '%personal%' THEN 4
    WHEN text ILIKE '%fantasy%' OR text ILIKE '%dream%' OR text ILIKE '%secret%' THEN 5
    WHEN text ILIKE '%fun%' OR text ILIKE '%laugh%' OR text ILIKE '%silly%' OR text ILIKE '%game%' THEN 2
    WHEN text ILIKE '%favorite%' OR text ILIKE '%prefer%' OR text ILIKE '%like%' THEN 2
    ELSE 3
  END,
  question_type = CASE 
    WHEN text ILIKE '%choose%' OR text ILIKE '%rather%' OR text ILIKE '%option%' THEN 'choice_based'
    WHEN text ILIKE '%imagine%' OR text ILIKE '%scenario%' OR text ILIKE '%situation%' THEN 'scenario'
    WHEN text ILIKE '%remember%' OR text ILIKE '%think about%' OR text ILIKE '%reflect%' THEN 'reflection'
    ELSE 'open_ended'
  END
WHERE category IS NULL OR intensity IS NULL OR question_type IS NULL;

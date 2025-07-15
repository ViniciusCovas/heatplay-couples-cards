-- Add language support to questions and levels tables
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' NOT NULL;
ALTER TABLE public.levels ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_language ON public.questions(language);
CREATE INDEX IF NOT EXISTS idx_levels_language ON public.levels(language);
CREATE INDEX IF NOT EXISTS idx_questions_level_language ON public.questions(level_id, language);

-- Update existing questions to have proper level associations based on content analysis
-- Level 1 (Ice Breaker): Simple, light questions
UPDATE public.questions SET level_id = (
  SELECT id FROM public.levels WHERE name = 'Ice Breaker' AND language = 'en' LIMIT 1
) WHERE text ILIKE ANY(ARRAY[
  '%favorite%',
  '%hobby%',
  '%music%',
  '%movie%',
  '%color%',
  '%food%',
  '%travel%',
  '%weekend%',
  '%book%',
  '%animal%'
]) AND level_id != (SELECT id FROM public.levels WHERE name = 'Ice Breaker' AND language = 'en' LIMIT 1);

-- Level 2 (Getting Personal): More personal but still safe
UPDATE public.questions SET level_id = (
  SELECT id FROM public.levels WHERE name = 'Getting Personal' AND language = 'en' LIMIT 1
) WHERE text ILIKE ANY(ARRAY[
  '%childhood%',
  '%family%',
  '%memory%',
  '%friendship%',
  '%relationship%',
  '%goal%',
  '%dream%',
  '%fear%',
  '%challenge%',
  '%proud%'
]) AND level_id != (SELECT id FROM public.levels WHERE name = 'Getting Personal' AND language = 'en' LIMIT 1);

-- Level 3 (Deep Thoughts): Philosophical and deep
UPDATE public.questions SET level_id = (
  SELECT id FROM public.levels WHERE name = 'Deep Thoughts' AND language = 'en' LIMIT 1
) WHERE text ILIKE ANY(ARRAY[
  '%meaning%',
  '%purpose%',
  '%philosophy%',
  '%belief%',
  '%society%',
  '%future%',
  '%regret%',
  '%wisdom%',
  '%change%',
  '%truth%'
]) AND level_id != (SELECT id FROM public.levels WHERE name = 'Deep Thoughts' AND language = 'en' LIMIT 1);

-- Level 4 (Intimate): Very personal and intimate
UPDATE public.questions SET level_id = (
  SELECT id FROM public.levels WHERE name = 'Intimate' AND language = 'en' LIMIT 1
) WHERE text ILIKE ANY(ARRAY[
  '%love%',
  '%relationship%',
  '%intimate%',
  '%secret%',
  '%vulnerable%',
  '%trust%',
  '%personal%',
  '%private%',
  '%emotion%',
  '%heart%'
]) AND level_id != (SELECT id FROM public.levels WHERE name = 'Intimate' AND language = 'en' LIMIT 1);

-- Create function to get random questions for a level in a specific language
CREATE OR REPLACE FUNCTION get_random_questions_for_level(
  level_id_param UUID,
  language_param VARCHAR(10) DEFAULT 'en',
  limit_param INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  text TEXT,
  category TEXT,
  level_id UUID,
  language VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.category, q.level_id, q.language, q.created_at, q.updated_at, q.is_active
  FROM public.questions q
  WHERE q.level_id = level_id_param 
    AND q.language = language_param 
    AND q.is_active = true
  ORDER BY RANDOM()
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
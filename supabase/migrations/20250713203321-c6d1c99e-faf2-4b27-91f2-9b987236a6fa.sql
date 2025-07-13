-- Create levels table
CREATE TABLE public.levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  bg_color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id uuid NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view levels" 
ON public.levels 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create levels" 
ON public.levels 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update levels" 
ON public.levels 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete levels" 
ON public.levels 
FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view questions" 
ON public.questions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update questions" 
ON public.questions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete questions" 
ON public.questions 
FOR DELETE 
USING (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_levels_updated_at
  BEFORE UPDATE ON public.levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing hardcoded levels
INSERT INTO public.levels (name, description, icon, color, bg_color, sort_order) VALUES
('Básico', 'Preguntas simples para conocerse mejor', '🌱', 'hsl(142 76% 36%)', 'hsl(142 76% 36% / 0.1)', 1),
('Intermedio', 'Preguntas más profundas sobre la relación', '🌸', 'hsl(280 100% 70%)', 'hsl(280 100% 70% / 0.1)', 2),
('Avanzado', 'Preguntas íntimas y reflexivas', '🔥', 'hsl(0 84% 60%)', 'hsl(0 84% 60% / 0.1)', 3),
('Experto', 'Preguntas complejas para parejas experimentadas', '💎', 'hsl(217 91% 60%)', 'hsl(217 91% 60% / 0.1)', 4);

-- Insert sample questions for each level
INSERT INTO public.questions (level_id, text, category) 
SELECT l.id, q.text, q.category
FROM public.levels l
CROSS JOIN (
  VALUES 
    ('¿Cuál fue tu primera impresión de mí?', 'reflexion'),
    ('¿Qué canción te recuerda a nosotros?', 'dinamica'),
    ('¿Cuál es tu recuerdo favorito juntos?', 'dinamica'),
    ('¿Qué admiras más de mí?', 'reflexion'),
    ('¿Cómo te imaginas nuestro futuro?', 'reflexion')
) AS q(text, category)
WHERE l.name = 'Básico'

UNION ALL

SELECT l.id, q.text, q.category
FROM public.levels l
CROSS JOIN (
  VALUES 
    ('¿Qué miedo compartes conmigo que no le dirías a nadie más?', 'profunda'),
    ('¿En qué momento supiste que me amabas?', 'profunda'),
    ('¿Qué aspectos de nuestra relación te gustaría mejorar?', 'reflexion'),
    ('¿Cuál ha sido tu mayor crecimiento personal desde que estamos juntos?', 'reflexion'),
    ('¿Qué sueño compartes conmigo?', 'profunda')
) AS q(text, category)
WHERE l.name = 'Intermedio'

UNION ALL

SELECT l.id, q.text, q.category
FROM public.levels l
CROSS JOIN (
  VALUES 
    ('¿Cuál es tu mayor inseguridad en nuestra relación?', 'intima'),
    ('¿Qué fantasía te gustaría cumplir conmigo?', 'intima'),
    ('¿En qué momentos sientes que somos más vulnerables juntos?', 'profunda'),
    ('¿Qué secreto nunca le has contado a nadie?', 'intima'),
    ('¿Cómo crees que hemos cambiado desde que estamos juntos?', 'profunda')
) AS q(text, category)
WHERE l.name = 'Avanzado'

UNION ALL

SELECT l.id, q.text, q.category
FROM public.levels l
CROSS JOIN (
  VALUES 
    ('¿Cuáles son tus límites absolutos en nuestra relación?', 'intima'),
    ('¿Qué conversación pendiente evitamos tener?', 'profunda'),
    ('¿En qué aspecto sientes que somos más compatibles?', 'profunda'),
    ('¿Qué te da más miedo perder de nuestra relación?', 'intima'),
    ('¿Cómo manejas los conflictos internos sobre nosotros?', 'intima')
) AS q(text, category)
WHERE l.name = 'Experto';
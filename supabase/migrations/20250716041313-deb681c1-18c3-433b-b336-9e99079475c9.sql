-- Fix the level names that weren't properly translated
UPDATE levels SET name = 'Warm-up' WHERE language = 'en' AND name = 'Descubrimiento';
UPDATE levels SET name = 'Basic Level' WHERE language = 'en' AND name = 'Conexión';
UPDATE levels SET name = 'Intermediate Level' WHERE language = 'en' AND name = 'Caliente';
UPDATE levels SET name = 'Advanced Level' WHERE language = 'en' AND name = 'Sin Filtros';

UPDATE levels SET name = 'Aquecimento' WHERE language = 'pt' AND name = 'Descubrimiento';
UPDATE levels SET name = 'Nível Básico' WHERE language = 'pt' AND name = 'Conexión';
UPDATE levels SET name = 'Nível Intermediário' WHERE language = 'pt' AND name = 'Caliente';
UPDATE levels SET name = 'Nível Avançado' WHERE language = 'pt' AND name = 'Sin Filtros';

UPDATE levels SET name = 'Échauffement' WHERE language = 'fr' AND name = 'Descubrimiento';
UPDATE levels SET name = 'Niveau de Base' WHERE language = 'fr' AND name = 'Conexión';
UPDATE levels SET name = 'Niveau Intermédiaire' WHERE language = 'fr' AND name = 'Caliente';
UPDATE levels SET name = 'Niveau Avancé' WHERE language = 'fr' AND name = 'Sin Filtros';

-- Now create English translations for questions
-- First, get the level mappings for questions
WITH level_mapping AS (
  SELECT 
    es_level.id as es_id,
    en_level.id as en_id,
    pt_level.id as pt_id,
    fr_level.id as fr_id
  FROM levels es_level
  JOIN levels en_level ON es_level.sort_order = en_level.sort_order AND en_level.language = 'en'
  JOIN levels pt_level ON es_level.sort_order = pt_level.sort_order AND pt_level.language = 'pt'
  JOIN levels fr_level ON es_level.sort_order = fr_level.sort_order AND fr_level.language = 'fr'
  WHERE es_level.language = 'es'
)
-- Insert English translations
INSERT INTO questions (text, category, level_id, language, is_active)
SELECT 
  CASE 
    -- Discovery Level (Descubrimiento)
    WHEN q.text = '¿Cuál fue tu primera impresión de mí?' THEN 'What was your first impression of me?'
    WHEN q.text = '¿Qué admiras más de mí?' THEN 'What do you admire most about me?'
    WHEN q.text = '¿Cuál es tu recuerdo favorito juntos?' THEN 'What is your favorite memory together?'
    WHEN q.text = '¿Qué te gusta más de pasar tiempo conmigo?' THEN 'What do you like most about spending time with me?'
    WHEN q.text = '¿Cuál es tu actividad favorita que hacemos juntos?' THEN 'What is your favorite activity we do together?'
    WHEN q.text = '¿Qué te hace sonreír cuando piensas en mí?' THEN 'What makes you smile when you think of me?'
    WHEN q.text = '¿Cuál es tu lugar favorito donde hemos estado juntos?' THEN 'What is your favorite place we have been together?'
    WHEN q.text = '¿Qué te sorprendió más de mí cuando nos conocimos?' THEN 'What surprised you most about me when we met?'
    WHEN q.text = '¿Cuál es tu comida favorita que compartimos?' THEN 'What is your favorite food we share?'
    WHEN q.text = '¿Qué te gusta más de mi personalidad?' THEN 'What do you like most about my personality?'
    
    -- Connection Level (Conexión)
    WHEN q.text = '¿Qué canción te recuerda a nosotros?' THEN 'What song reminds you of us?'
    WHEN q.text = '¿Cómo te imaginas nuestro futuro?' THEN 'How do you imagine our future?'
    WHEN q.text = '¿Qué es lo que más valoras de nuestra relación?' THEN 'What do you value most about our relationship?'
    WHEN q.text = '¿Cuál es tu mayor sueño que tenemos en común?' THEN 'What is your biggest dream that we have in common?'
    WHEN q.text = '¿Qué aventura te gustaría vivir conmigo?' THEN 'What adventure would you like to live with me?'
    WHEN q.text = '¿Cómo me describirías a un amigo?' THEN 'How would you describe me to a friend?'
    WHEN q.text = '¿Qué tradición te gustaría crear juntos?' THEN 'What tradition would you like to create together?'
    WHEN q.text = '¿Cuál es tu momento más romántico conmigo?' THEN 'What is your most romantic moment with me?'
    WHEN q.text = '¿Qué es lo que más te tranquiliza de estar conmigo?' THEN 'What calms you most about being with me?'
    WHEN q.text = '¿Cómo celebrarías nuestro aniversario ideal?' THEN 'How would you celebrate our ideal anniversary?'
    
    -- Hot Level (Caliente)
    WHEN q.text = '¿Cuál es tu fantasía más salvaje conmigo?' THEN 'What is your wildest fantasy with me?'
    WHEN q.text = '¿Qué es lo más atrevido que has pensado hacer conmigo?' THEN 'What is the most daring thing you have thought of doing with me?'
    WHEN q.text = '¿Cuál es tu parte favorita de mi cuerpo?' THEN 'What is your favorite part of my body?'
    WHEN q.text = '¿Qué te excita más de mí?' THEN 'What excites you most about me?'
    WHEN q.text = '¿Cuál es tu posición favorita?' THEN 'What is your favorite position?'
    WHEN q.text = '¿Qué lugar público te gustaría explorar conmigo?' THEN 'What public place would you like to explore with me?'
    WHEN q.text = '¿Cuál es tu juego previo favorito?' THEN 'What is your favorite foreplay?'
    WHEN q.text = '¿Qué prenda mía te vuelve loco/a?' THEN 'What garment of mine drives you crazy?'
    WHEN q.text = '¿Cuál es tu momento más caliente conmigo?' THEN 'What is your hottest moment with me?'
    WHEN q.text = '¿Qué te gustaría probar juntos?' THEN 'What would you like to try together?'
    
    -- No Filter Level (Sin Filtros)
    WHEN q.text = '¿Cuál es tu mayor miedo en nuestra relación?' THEN 'What is your biggest fear in our relationship?'
    WHEN q.text = '¿Qué es lo que nunca me has dicho?' THEN 'What have you never told me?'
    WHEN q.text = '¿Hay algo que te molesta de mí pero no me has dicho?' THEN 'Is there something that bothers you about me but you haven''t told me?'
    WHEN q.text = '¿Cuál es tu mayor inseguridad?' THEN 'What is your biggest insecurity?'
    WHEN q.text = '¿Qué es lo más vulnerable que puedes compartir conmigo?' THEN 'What is the most vulnerable thing you can share with me?'
    WHEN q.text = '¿Hay algo de tu pasado que afecte nuestra relación?' THEN 'Is there something from your past that affects our relationship?'
    WHEN q.text = '¿Qué necesitas más de mí en este momento?' THEN 'What do you need most from me right now?'
    WHEN q.text = '¿Cuál es tu mayor arrepentimiento?' THEN 'What is your biggest regret?'
    WHEN q.text = '¿Qué cambiarías de nuestra relación?' THEN 'What would you change about our relationship?'
    WHEN q.text = '¿Cuál es tu secreto más profundo?' THEN 'What is your deepest secret?'
    
    ELSE q.text
  END as translated_text,
  q.category,
  lm.en_id,
  'en',
  q.is_active
FROM questions q
JOIN level_mapping lm ON q.level_id = lm.es_id
WHERE q.language = 'es';
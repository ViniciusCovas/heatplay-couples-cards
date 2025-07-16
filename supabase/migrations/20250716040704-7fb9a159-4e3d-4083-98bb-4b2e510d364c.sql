-- Step 1: Fix current language markers
UPDATE questions SET language = 'es' WHERE language = 'en';
UPDATE levels SET language = 'es' WHERE language = 'en';

-- Step 2: Create English translations for levels
INSERT INTO levels (name, description, sort_order, language, icon, color, bg_color)
SELECT 
  CASE 
    WHEN name = 'Calentamiento' THEN 'Warm-up'
    WHEN name = 'Nivel Básico' THEN 'Basic Level'
    WHEN name = 'Nivel Intermedio' THEN 'Intermediate Level'
    WHEN name = 'Nivel Avanzado' THEN 'Advanced Level'
    ELSE name
  END,
  CASE 
    WHEN description = 'Preguntas ligeras para romper el hielo' THEN 'Light questions to break the ice'
    WHEN description = 'Preguntas básicas para conocerse mejor' THEN 'Basic questions to get to know each other better'
    WHEN description = 'Preguntas más profundas sobre la relación' THEN 'Deeper questions about the relationship'
    WHEN description = 'Preguntas íntimas y profundas' THEN 'Intimate and deep questions'
    ELSE description
  END,
  sort_order,
  'en',
  icon,
  color,
  bg_color
FROM levels 
WHERE language = 'es';

-- Step 3: Create Portuguese translations for levels
INSERT INTO levels (name, description, sort_order, language, icon, color, bg_color)
SELECT 
  CASE 
    WHEN name = 'Calentamiento' THEN 'Aquecimento'
    WHEN name = 'Nivel Básico' THEN 'Nível Básico'
    WHEN name = 'Nivel Intermedio' THEN 'Nível Intermediário'
    WHEN name = 'Nivel Avanzado' THEN 'Nível Avançado'
    ELSE name
  END,
  CASE 
    WHEN description = 'Preguntas ligeras para romper el hielo' THEN 'Perguntas leves para quebrar o gelo'
    WHEN description = 'Preguntas básicas para conocerse mejor' THEN 'Perguntas básicas para se conhecer melhor'
    WHEN description = 'Preguntas más profundas sobre la relación' THEN 'Perguntas mais profundas sobre o relacionamento'
    WHEN description = 'Preguntas íntimas y profundas' THEN 'Perguntas íntimas e profundas'
    ELSE description
  END,
  sort_order,
  'pt',
  icon,
  color,
  bg_color
FROM levels 
WHERE language = 'es';

-- Step 4: Create French translations for levels
INSERT INTO levels (name, description, sort_order, language, icon, color, bg_color)
SELECT 
  CASE 
    WHEN name = 'Calentamiento' THEN 'Échauffement'
    WHEN name = 'Nivel Básico' THEN 'Niveau de Base'
    WHEN name = 'Nivel Intermedio' THEN 'Niveau Intermédiaire'
    WHEN name = 'Nivel Avanzado' THEN 'Niveau Avancé'
    ELSE name
  END,
  CASE 
    WHEN description = 'Preguntas ligeras para romper el hielo' THEN 'Questions légères pour briser la glace'
    WHEN description = 'Preguntas básicas para conocerse mejor' THEN 'Questions de base pour mieux se connaître'
    WHEN description = 'Preguntas más profundas sobre la relación' THEN 'Questions plus profondes sur la relation'
    WHEN description = 'Preguntas íntimas y profundas' THEN 'Questions intimes et profondes'
    ELSE description
  END,
  sort_order,
  'fr',
  icon,
  color,
  bg_color
FROM levels 
WHERE language = 'es';
-- Create Portuguese translations for questions
WITH level_mapping AS (
  SELECT 
    es_level.id as es_id,
    pt_level.id as pt_id
  FROM levels es_level
  JOIN levels pt_level ON es_level.sort_order = pt_level.sort_order AND pt_level.language = 'pt'
  WHERE es_level.language = 'es'
)
INSERT INTO questions (text, category, level_id, language, is_active)
SELECT 
  CASE 
    -- Discovery Level
    WHEN q.text = '¿Cuál fue tu primera impresión de mí?' THEN 'Qual foi sua primeira impressão de mim?'
    WHEN q.text = '¿Qué admiras más de mí?' THEN 'O que você mais admira em mim?'
    WHEN q.text = '¿Cuál es tu recuerdo favorito juntos?' THEN 'Qual é sua memória favorita juntos?'
    WHEN q.text = '¿Qué te gusta más de pasar tiempo conmigo?' THEN 'O que você mais gosta de passar tempo comigo?'
    WHEN q.text = '¿Cuál es tu actividad favorita que hacemos juntos?' THEN 'Qual é sua atividade favorita que fazemos juntos?'
    WHEN q.text = '¿Qué te hace sonreír cuando piensas en mí?' THEN 'O que te faz sorrir quando pensa em mim?'
    WHEN q.text = '¿Cuál es tu lugar favorito donde hemos estado juntos?' THEN 'Qual é seu lugar favorito onde estivemos juntos?'
    WHEN q.text = '¿Qué te sorprendió más de mí cuando nos conocimos?' THEN 'O que mais te surpreendeu em mim quando nos conhecemos?'
    WHEN q.text = '¿Cuál es tu comida favorita que compartimos?' THEN 'Qual é sua comida favorita que compartilhamos?'
    WHEN q.text = '¿Qué te gusta más de mi personalidad?' THEN 'O que você mais gosta da minha personalidade?'
    
    -- Connection Level
    WHEN q.text = '¿Qué canción te recuerda a nosotros?' THEN 'Que música te lembra de nós?'
    WHEN q.text = '¿Cómo te imaginas nuestro futuro?' THEN 'Como você imagina nosso futuro?'
    WHEN q.text = '¿Qué es lo que más valoras de nuestra relación?' THEN 'O que você mais valoriza em nosso relacionamento?'
    WHEN q.text = '¿Cuál es tu mayor sueño que tenemos en común?' THEN 'Qual é seu maior sonho que temos em comum?'
    WHEN q.text = '¿Qué aventura te gustaría vivir conmigo?' THEN 'Que aventura você gostaria de viver comigo?'
    WHEN q.text = '¿Cómo me describirías a un amigo?' THEN 'Como você me descreveria para um amigo?'
    WHEN q.text = '¿Qué tradición te gustaría crear juntos?' THEN 'Que tradição você gostaria de criar juntos?'
    WHEN q.text = '¿Cuál es tu momento más romántico conmigo?' THEN 'Qual é seu momento mais romântico comigo?'
    WHEN q.text = '¿Qué es lo que más te tranquiliza de estar conmigo?' THEN 'O que mais te acalma sobre estar comigo?'
    WHEN q.text = '¿Cómo celebrarías nuestro aniversario ideal?' THEN 'Como você celebraria nosso aniversário ideal?'
    
    -- Hot Level
    WHEN q.text = '¿Cuál es tu fantasía más salvaje conmigo?' THEN 'Qual é sua fantasia mais selvagem comigo?'
    WHEN q.text = '¿Qué es lo más atrevido que has pensado hacer conmigo?' THEN 'Qual é a coisa mais ousada que você pensou em fazer comigo?'
    WHEN q.text = '¿Cuál es tu parte favorita de mi cuerpo?' THEN 'Qual é sua parte favorita do meu corpo?'
    WHEN q.text = '¿Qué te excita más de mí?' THEN 'O que mais te excita em mim?'
    WHEN q.text = '¿Cuál es tu posición favorita?' THEN 'Qual é sua posição favorita?'
    WHEN q.text = '¿Qué lugar público te gustaría explorar conmigo?' THEN 'Que lugar público você gostaria de explorar comigo?'
    WHEN q.text = '¿Cuál es tu juego previo favorito?' THEN 'Qual é suas preliminares favoritas?'
    WHEN q.text = '¿Qué prenda mía te vuelve loco/a?' THEN 'Que roupa minha te deixa louco(a)?'
    WHEN q.text = '¿Cuál es tu momento más caliente conmigo?' THEN 'Qual é seu momento mais quente comigo?'
    WHEN q.text = '¿Qué te gustaría probar juntos?' THEN 'O que você gostaria de experimentar juntos?'
    
    -- No Filter Level
    WHEN q.text = '¿Cuál es tu mayor miedo en nuestra relación?' THEN 'Qual é seu maior medo em nosso relacionamento?'
    WHEN q.text = '¿Qué es lo que nunca me has dicho?' THEN 'O que você nunca me disse?'
    WHEN q.text = '¿Hay algo que te molesta de mí pero no me has dicho?' THEN 'Há algo que te incomoda em mim mas você não me disse?'
    WHEN q.text = '¿Cuál es tu mayor inseguridad?' THEN 'Qual é sua maior insegurança?'
    WHEN q.text = '¿Qué es lo más vulnerable que puedes compartir conmigo?' THEN 'O que é mais vulnerável que você pode compartilhar comigo?'
    WHEN q.text = '¿Hay algo de tu pasado que afecte nuestra relación?' THEN 'Há algo do seu passado que afeta nosso relacionamento?'
    WHEN q.text = '¿Qué necesitas más de mí en este momento?' THEN 'O que você mais precisa de mim neste momento?'
    WHEN q.text = '¿Cuál es tu mayor arrepentimiento?' THEN 'Qual é seu maior arrependimento?'
    WHEN q.text = '¿Qué cambiarías de nuestra relación?' THEN 'O que você mudaria em nosso relacionamento?'
    WHEN q.text = '¿Cuál es tu secreto más profundo?' THEN 'Qual é seu segredo mais profundo?'
    
    ELSE q.text
  END as translated_text,
  q.category,
  lm.pt_id,
  'pt',
  q.is_active
FROM questions q
JOIN level_mapping lm ON q.level_id = lm.es_id
WHERE q.language = 'es';
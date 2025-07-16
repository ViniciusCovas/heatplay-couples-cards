-- Create French translations for questions
WITH level_mapping AS (
  SELECT 
    es_level.id as es_id,
    fr_level.id as fr_id
  FROM levels es_level
  JOIN levels fr_level ON es_level.sort_order = fr_level.sort_order AND fr_level.language = 'fr'
  WHERE es_level.language = 'es'
)
INSERT INTO questions (text, category, level_id, language, is_active)
SELECT 
  CASE 
    -- Discovery Level
    WHEN q.text = '¿Cuál fue tu primera impresión de mí?' THEN 'Quelle a été ta première impression de moi?'
    WHEN q.text = '¿Qué admiras más de mí?' THEN 'Qu''est-ce que tu admires le plus chez moi?'
    WHEN q.text = '¿Cuál es tu recuerdo favorito juntos?' THEN 'Quel est ton souvenir préféré ensemble?'
    WHEN q.text = '¿Qué te gusta más de pasar tiempo conmigo?' THEN 'Qu''est-ce que tu aimes le plus dans le fait de passer du temps avec moi?'
    WHEN q.text = '¿Cuál es tu actividad favorita que hacemos juntos?' THEN 'Quelle est ton activité préférée que nous faisons ensemble?'
    WHEN q.text = '¿Qué te hace sonreír cuando piensas en mí?' THEN 'Qu''est-ce qui te fait sourire quand tu penses à moi?'
    WHEN q.text = '¿Cuál es tu lugar favorito donde hemos estado juntos?' THEN 'Quel est ton endroit préféré où nous avons été ensemble?'
    WHEN q.text = '¿Qué te sorprendió más de mí cuando nos conocimos?' THEN 'Qu''est-ce qui t''a le plus surpris chez moi quand nous nous sommes rencontrés?'
    WHEN q.text = '¿Cuál es tu comida favorita que compartimos?' THEN 'Quel est ton plat préféré que nous partageons?'
    WHEN q.text = '¿Qué te gusta más de mi personalidad?' THEN 'Qu''est-ce que tu aimes le plus dans ma personnalité?'
    
    -- Connection Level
    WHEN q.text = '¿Qué canción te recuerda a nosotros?' THEN 'Quelle chanson te rappelle nous?'
    WHEN q.text = '¿Cómo te imaginas nuestro futuro?' THEN 'Comment imagines-tu notre avenir?'
    WHEN q.text = '¿Qué es lo que más valoras de nuestra relación?' THEN 'Qu''est-ce que tu valorises le plus dans notre relation?'
    WHEN q.text = '¿Cuál es tu mayor sueño que tenemos en común?' THEN 'Quel est ton plus grand rêve que nous avons en commun?'
    WHEN q.text = '¿Qué aventura te gustaría vivir conmigo?' THEN 'Quelle aventure aimerais-tu vivre avec moi?'
    WHEN q.text = '¿Cómo me describirías a un amigo?' THEN 'Comment me décrirais-tu à un ami?'
    WHEN q.text = '¿Qué tradición te gustaría crear juntos?' THEN 'Quelle tradition aimerais-tu créer ensemble?'
    WHEN q.text = '¿Cuál es tu momento más romántico conmigo?' THEN 'Quel est ton moment le plus romantique avec moi?'
    WHEN q.text = '¿Qué es lo que más te tranquiliza de estar conmigo?' THEN 'Qu''est-ce qui te rassure le plus d''être avec moi?'
    WHEN q.text = '¿Cómo celebrarías nuestro aniversario ideal?' THEN 'Comment célébrerais-tu notre anniversaire idéal?'
    
    -- Hot Level
    WHEN q.text = '¿Cuál es tu fantasía más salvaje conmigo?' THEN 'Quel est ton fantasme le plus sauvage avec moi?'
    WHEN q.text = '¿Qué es lo más atrevido que has pensado hacer conmigo?' THEN 'Quelle est la chose la plus audacieuse que tu as pensé faire avec moi?'
    WHEN q.text = '¿Cuál es tu parte favorita de mi cuerpo?' THEN 'Quelle est ta partie préférée de mon corps?'
    WHEN q.text = '¿Qué te excita más de mí?' THEN 'Qu''est-ce qui t''excite le plus chez moi?'
    WHEN q.text = '¿Cuál es tu posición favorita?' THEN 'Quelle est ta position préférée?'
    WHEN q.text = '¿Qué lugar público te gustaría explorar conmigo?' THEN 'Quel lieu public aimerais-tu explorer avec moi?'
    WHEN q.text = '¿Cuál es tu juego previo favorito?' THEN 'Quels sont tes préliminaires préférés?'
    WHEN q.text = '¿Qué prenda mía te vuelve loco/a?' THEN 'Quel vêtement à moi te rend fou/folle?'
    WHEN q.text = '¿Cuál es tu momento más caliente conmigo?' THEN 'Quel est ton moment le plus chaud avec moi?'
    WHEN q.text = '¿Qué te gustaría probar juntos?' THEN 'Qu''aimerais-tu essayer ensemble?'
    
    -- No Filter Level
    WHEN q.text = '¿Cuál es tu mayor miedo en nuestra relación?' THEN 'Quelle est ta plus grande peur dans notre relation?'
    WHEN q.text = '¿Qué es lo que nunca me has dicho?' THEN 'Qu''est-ce que tu ne m''as jamais dit?'
    WHEN q.text = '¿Hay algo que te molesta de mí pero no me has dicho?' THEN 'Y a-t-il quelque chose qui t''ennuie chez moi mais que tu ne m''as pas dit?'
    WHEN q.text = '¿Cuál es tu mayor inseguridad?' THEN 'Quelle est ta plus grande insécurité?'
    WHEN q.text = '¿Qué es lo más vulnerable que puedes compartir conmigo?' THEN 'Quelle est la chose la plus vulnérable que tu puisses partager avec moi?'
    WHEN q.text = '¿Hay algo de tu pasado que afecte nuestra relación?' THEN 'Y a-t-il quelque chose de ton passé qui affecte notre relation?'
    WHEN q.text = '¿Qué necesitas más de mí en este momento?' THEN 'De quoi as-tu le plus besoin de moi en ce moment?'
    WHEN q.text = '¿Cuál es tu mayor arrepentimiento?' THEN 'Quel est ton plus grand regret?'
    WHEN q.text = '¿Qué cambiarías de nuestra relación?' THEN 'Que changerais-tu dans notre relation?'
    WHEN q.text = '¿Cuál es tu secreto más profundo?' THEN 'Quel est ton secret le plus profond?'
    
    ELSE q.text
  END as translated_text,
  q.category,
  lm.fr_id,
  'fr',
  q.is_active
FROM questions q
JOIN level_mapping lm ON q.level_id = lm.es_id
WHERE q.language = 'es';
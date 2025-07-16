-- Fix questions with incorrect language content
-- Update questions marked as 'en' but containing Spanish text to proper English

UPDATE questions SET text = 'What was the first thing you thought of me when you saw me for the first time?' WHERE text = '¿Qué fue lo primero que pensaste de mí cuando me viste por primera vez?' AND language = 'en';

UPDATE questions SET text = 'If you could have any superpower, what would it be and why?' WHERE text = 'Si pudieras tener cualquier superpoder, ¿cuál sería y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is your most precious childhood memory?' WHERE text = '¿Cuál es tu recuerdo más preciado de la infancia?' AND language = 'en';

UPDATE questions SET text = 'Describe your perfect day, with no budget limitations.' WHERE text = 'Describe tu día perfecto, sin ningún tipo de limitación de presupuesto.' AND language = 'en';

UPDATE questions SET text = 'What has been the worst date you have ever had in your life?' WHERE text = '¿Cuál ha sido la peor cita que has tenido en tu vida?' AND language = 'en';

UPDATE questions SET text = 'If you could travel anywhere in the world, where would you go and why?' WHERE text = 'Si pudieras viajar a cualquier lugar del mundo, ¿a dónde irías y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is something you have always wanted to learn but have never had the chance to?' WHERE text = '¿Qué es algo que siempre has querido aprender pero nunca has tenido la oportunidad?' AND language = 'en';

UPDATE questions SET text = 'What do you think is the most important quality in a person?' WHERE text = '¿Qué crees que es la cualidad más importante en una persona?' AND language = 'en';

UPDATE questions SET text = 'If you could change one thing about the world, what would it be?' WHERE text = 'Si pudieras cambiar una cosa del mundo, ¿qué sería?' AND language = 'en';

UPDATE questions SET text = 'What is your greatest fear and why?' WHERE text = '¿Cuál es tu mayor miedo y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is the best piece of advice you have ever received?' WHERE text = '¿Cuál es el mejor consejo que has recibido en tu vida?' AND language = 'en';

UPDATE questions SET text = 'If you could meet any historical figure, who would it be and what would you ask them?' WHERE text = 'Si pudieras conocer a cualquier figura histórica, ¿quién sería y qué le preguntarías?' AND language = 'en';

UPDATE questions SET text = 'What is something you are passionate about that few people know?' WHERE text = '¿Qué es algo que te apasiona y que poca gente conoce?' AND language = 'en';

UPDATE questions SET text = 'What is your definition of success?' WHERE text = '¿Cuál es tu definición de éxito?' AND language = 'en';

UPDATE questions SET text = 'If you could have dinner with any three people, living or dead, who would they be?' WHERE text = 'Si pudieras cenar con cualquier tres personas, vivas o muertas, ¿quiénes serían?' AND language = 'en';

UPDATE questions SET text = 'What is something you would like to do differently in your life?' WHERE text = '¿Qué es algo que te gustaría hacer diferente en tu vida?' AND language = 'en';

UPDATE questions SET text = 'What is your most treasured possession and why?' WHERE text = '¿Cuál es tu posesión más preciada y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is something that makes you laugh out loud?' WHERE text = '¿Qué es algo que te hace reír a carcajadas?' AND language = 'en';

UPDATE questions SET text = 'If you could live in any time period, which would you choose and why?' WHERE text = 'Si pudieras vivir en cualquier época, ¿cuál elegirías y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is your favorite way to spend a weekend?' WHERE text = '¿Cuál es tu forma favorita de pasar un fin de semana?' AND language = 'en';

UPDATE questions SET text = 'What is something you have done that you are most proud of?' WHERE text = '¿Qué es algo que has hecho de lo que te sientes más orgulloso?' AND language = 'en';

UPDATE questions SET text = 'If you could have any job in the world, what would it be?' WHERE text = 'Si pudieras tener cualquier trabajo en el mundo, ¿cuál sería?' AND language = 'en';

UPDATE questions SET text = 'What is something you have learned recently that has changed your perspective?' WHERE text = '¿Qué es algo que has aprendido recientemente que ha cambiado tu perspectiva?' AND language = 'en';

UPDATE questions SET text = 'What is your favorite book or movie and why?' WHERE text = '¿Cuál es tu libro o película favorita y por qué?' AND language = 'en';

UPDATE questions SET text = 'If you could give advice to your younger self, what would it be?' WHERE text = 'Si pudieras dar un consejo a tu yo más joven, ¿cuál sería?' AND language = 'en';

UPDATE questions SET text = 'What is something you do to relax when you are stressed?' WHERE text = '¿Qué es algo que haces para relajarte cuando estás estresado?' AND language = 'en';

UPDATE questions SET text = 'What is your biggest dream or goal in life?' WHERE text = '¿Cuál es tu mayor sueño o meta en la vida?' AND language = 'en';

UPDATE questions SET text = 'If you could live anywhere in the world, where would you choose and why?' WHERE text = 'Si pudieras vivir en cualquier lugar del mundo, ¿dónde elegirías y por qué?' AND language = 'en';

UPDATE questions SET text = 'What is something you have always been curious about?' WHERE text = '¿Qué es algo de lo que siempre has tenido curiosidad?' AND language = 'en';

UPDATE questions SET text = 'What is your favorite family tradition or memory?' WHERE text = '¿Cuál es tu tradición familiar favorita o recuerdo?' AND language = 'en';

-- Update French questions (currently in Spanish)
UPDATE questions SET text = 'Quelle a été la première chose que tu as pensée de moi quand tu m''as vue pour la première fois ?' WHERE text = '¿Qué fue lo primero que pensaste de mí cuando me viste por primera vez?' AND language = 'fr';

UPDATE questions SET text = 'Si tu pouvais avoir n''importe quel superpouvoir, lequel serait-ce et pourquoi ?' WHERE text = 'Si pudieras tener cualquier superpoder, ¿cuál sería y por qué?' AND language = 'fr';

UPDATE questions SET text = 'Quel est ton souvenir d''enfance le plus précieux ?' WHERE text = '¿Cuál es tu recuerdo más preciado de la infancia?' AND language = 'fr';

UPDATE questions SET text = 'Décris ta journée parfaite, sans aucune limitation budgétaire.' WHERE text = 'Describe tu día perfecto, sin ningún tipo de limitación de presupuesto.' AND language = 'fr';

UPDATE questions SET text = 'Quel a été le pire rendez-vous que tu aies jamais eu dans ta vie ?' WHERE text = '¿Cuál ha sido la peor cita que has tenido en tu vida?' AND language = 'fr';

-- Update Portuguese questions (currently in Spanish)
UPDATE questions SET text = 'O que foi a primeira coisa que você pensou sobre mim quando me viu pela primeira vez?' WHERE text = '¿Qué fue lo primero que pensaste de mí cuando me viste por primera vez?' AND language = 'pt';

UPDATE questions SET text = 'Se você pudesse ter qualquer superpoder, qual seria e por quê?' WHERE text = 'Si pudieras tener cualquier superpoder, ¿cuál sería y por qué?' AND language = 'pt';

UPDATE questions SET text = 'Qual é sua memória mais preciosa da infância?' WHERE text = '¿Cuál es tu recuerdo más preciado de la infancia?' AND language = 'pt';

UPDATE questions SET text = 'Descreva seu dia perfeito, sem nenhum tipo de limitação de orçamento.' WHERE text = 'Describe tu día perfecto, sin ningún tipo de limitación de presupuesto.' AND language = 'pt';

UPDATE questions SET text = 'Qual foi o pior encontro que você já teve em sua vida?' WHERE text = '¿Cuál ha sido la peor cita que has tenido en tu vida?' AND language = 'pt';
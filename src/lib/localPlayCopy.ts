const localPlayCopy = {
  es: {
    mode: 'Partida gratuita · Un teléfono para dos',
    choose: 'Elijan juntos el nivel. Una persona pregunta, la otra responde. Después cambian.',
    doneTitle: 'Un momento para ustedes.',
    summary: (count: number) => count === 0 ? 'Su próxima conversación puede empezar con una carta.' : `Compartieron ${count === 1 ? 'una carta' : `${count} cartas`}. Lo que viene después lo eligen ustedes.`,
    replay: 'Jugar otra ronda',
    limitations: 'El progreso se pierde al cerrar o recargar esta pestaña.',
  },
  en: {
    mode: 'Free session · One phone for two',
    choose: 'Choose a level together. One person asks, the other answers. Then swap.',
    doneTitle: 'A moment for the two of you.',
    summary: (count: number) => count === 0 ? 'Your next conversation can start with a card.' : `You shared ${count === 1 ? 'one card' : `${count} cards`}. What comes next is up to you.`,
    replay: 'Play another round',
    limitations: 'Progress is lost when you close or reload this tab.',
  },
  pt: {
    mode: 'Partida grátis · Um celular para dois',
    choose: 'Escolham o nível juntos. Uma pessoa pergunta, a outra responde. Depois troquem.',
    doneTitle: 'Um momento para vocês.',
    summary: (count: number) => count === 0 ? 'A próxima conversa de vocês pode começar com uma carta.' : `Vocês compartilharam ${count === 1 ? 'uma carta' : `${count} cartas`}. O que vem depois, vocês escolhem.`,
    replay: 'Jogar outra rodada',
    limitations: 'O progresso se perde ao fechar ou recarregar esta aba.',
  },
  fr: {
    mode: 'Partie gratuite · Un téléphone pour deux',
    choose: 'Choisissez un niveau ensemble. Une personne pose la question, l’autre répond. Puis échangez.',
    doneTitle: 'Un moment pour vous deux.',
    summary: (count: number) => count === 0 ? 'Votre prochaine conversation peut commencer par une carte.' : `Vous avez partagé ${count === 1 ? 'une carte' : `${count} cartes`}. À vous de choisir la suite.`,
    replay: 'Jouer une autre partie',
    limitations: 'La progression est perdue si vous fermez ou actualisez cet onglet.',
  },
};

export function getLocalPlayCopy(language: string) {
  const locale = language.split('-')[0] as keyof typeof localPlayCopy;
  return localPlayCopy[locale] ?? localPlayCopy.en;
}

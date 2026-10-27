const localPlayCopy = {
  es: {
    mode: 'Demo local · Vista previa de las cartas',
    choose: 'Exploren un nivel y los turnos de pregunta y respuesta. Esta demo no conecta dos teléfonos.',
    doneTitle: 'Así se sienten las cartas.',
    summary: (count: number) => count === 0 ? 'Su próxima conversación puede empezar con una carta.' : `Probaron ${count === 1 ? 'una carta' : `${count} cartas`} en esta demo. La partida conectada será con un teléfono para cada persona.`,
    replay: 'Explorar otra ronda',
    limitations: 'La partida sincronizada entre dos teléfonos está pendiente de conexión. El progreso de esta demo se pierde al cerrar o recargar la pestaña.',
  },
  en: {
    mode: 'Local demo · Card preview',
    choose: 'Explore a level and the question-and-answer turns. This demo does not connect two phones.',
    doneTitle: 'A feel for the cards.',
    summary: (count: number) => count === 0 ? 'Your next conversation can start with a card.' : `You tried ${count === 1 ? 'one card' : `${count} cards`} in this demo. In the connected game, each person will use their own phone.`,
    replay: 'Explore another round',
    limitations: 'Synchronized play between two phones is not connected yet. Demo progress is lost when you close or reload this tab.',
  },
  pt: {
    mode: 'Demo local · Prévia das cartas',
    choose: 'Explorem um nível e os turnos de pergunta e resposta. Esta demo não conecta dois celulares.',
    doneTitle: 'Uma amostra das cartas.',
    summary: (count: number) => count === 0 ? 'A próxima conversa de vocês pode começar com uma carta.' : `Vocês experimentaram ${count === 1 ? 'uma carta' : `${count} cartas`} nesta demo. Na partida conectada, cada pessoa usará seu celular.`,
    replay: 'Explorar outra rodada',
    limitations: 'A partida sincronizada entre dois celulares ainda depende da conexão. O progresso da demo se perde ao fechar ou recarregar esta aba.',
  },
  fr: {
    mode: 'Démo locale · Aperçu des cartes',
    choose: 'Explorez un niveau et les tours de questions et réponses. Cette démo ne connecte pas deux téléphones.',
    doneTitle: 'Un aperçu des cartes.',
    summary: (count: number) => count === 0 ? 'Votre prochaine conversation peut commencer par une carte.' : `Vous avez essayé ${count === 1 ? 'une carte' : `${count} cartes`} dans cette démo. Dans la partie connectée, chacun utilisera son téléphone.`,
    replay: 'Explorer une autre manche',
    limitations: 'La partie synchronisée entre deux téléphones n’est pas encore connectée. La progression de la démo est perdue si vous fermez ou actualisez cet onglet.',
  },
};

export function getLocalPlayCopy(language: string) {
  const locale = language.split('-')[0] as keyof typeof localPlayCopy;
  return localPlayCopy[locale] ?? localPlayCopy.en;
}

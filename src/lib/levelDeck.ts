/** Editorial preview catalog. IDs describe a specific level/topic, never a compatibility score. */
export const levelDeck = {
  1: { topic: 'playfulness', guess: { joke: '😂', look: '😉', compliment: '✨', memory: '💭' }, match: { story: '😂', memory: '💭', compliment: '✨', discovery: '🤩' } },
  2: { topic: 'emotional-understanding', guess: { listen: '👂', hug: '🫂', questions: '💬', space: '🌿' }, match: { gratitude: '🙏', memory: '💭', need: '🫶', dream: '🌠' } },
  3: { topic: 'flirting', guess: { gaze: '👀', whisper: '🤫', compliment: '🔥', closeness: '💞' }, match: { attraction: '🔥', gaze: '👀', chemistry: '✨', desire: '💋' } },
  4: { topic: 'intimate-communication', guess: { enjoyment: '❤️‍🔥', curiosity: '🫣', pace: '🌊', boundary: '🫶' }, match: { enjoyment: '❤️‍🔥', curiosity: '🫣', boundaries: '🫶', invitation: '💌' } },
} as const;
export type CardLevel = keyof typeof levelDeck;
export function getLevelDeck(level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new Error('Invalid card level');
  return levelDeck[level as CardLevel];
}
export function cardContext(level: number, kind: 'guess' | 'match' | 'conversation' | 'action', index = 0) {
  return { cardKey: `editorial-v2:${level}:${kind}:${index}`, level, topic: getLevelDeck(level).topic, catalogVersion: 'editorial-v2' as const };
}
export function feedbackComplete(signal: { feeling: string | null; pace: string | null }): boolean {
  return ['closer', 'discovery', 'desire', 'uncomfortable'].includes(signal.feeling ?? '')
    && ['lighter', 'same', 'deeper'].includes(signal.pace ?? '');
}

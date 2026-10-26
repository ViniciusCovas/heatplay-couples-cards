import { QUESTIONS } from './spark-questions.ts';

export type Mood = 'playful' | 'close' | 'flirty';
export type DatePreferences = {
  mood: Mood;
  minutes: 10 | 20 | 40;
  heat: 0 | 1 | 2;
  depth: 0 | 1;
};
export type DateCard = { id: number; heat: number; depth: number; mood: Mood };

// Editorial boundaries, never inferred from time spent, skipped cards or ratings.
// IDs refer to the existing four-language Daily Spark collection.
const WARM = new Set([26, 32, 36, 41, 48, 54]);
const HOT = new Set([51, 59]);
const DEEP = new Set([3, 9, 10, 14, 18, 22, 23, 27, 29, 39, 40, 43, 45, 49, 56, 57, 58]);
const PLAYFUL = new Set([1, 4, 7, 12, 13, 15, 16, 25, 31, 37, 42, 48, 54]);
export const DATE_CARDS: DateCard[] = QUESTIONS.en.map((_, id) => ({
  id, heat: HOT.has(id) ? 2 : WARM.has(id) ? 1 : 0,
  depth: DEEP.has(id) ? 1 : 0,
  mood: WARM.has(id) || HOT.has(id) ? 'flirty' : PLAYFUL.has(id) ? 'playful' : 'close',
}));

export function isPreferences(value: unknown): value is DatePreferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return ['playful', 'close', 'flirty'].includes(String(p.mood)) &&
    [10, 20, 40].includes(Number(p.minutes)) && typeof p.minutes === 'number' &&
    [0, 1, 2].includes(Number(p.heat)) && typeof p.heat === 'number' &&
    [0, 1].includes(Number(p.depth)) && typeof p.depth === 'number';
}

export function eligibleCards(p: DatePreferences): DateCard[] {
  return DATE_CARDS.filter(c => c.heat <= p.heat && c.depth <= p.depth);
}

export function cardCount(p: DatePreferences): number {
  return p.minutes === 10 ? 6 : p.minutes === 20 ? 10 : 16;
}

/** A complete offline experience, with a gentle opening and an actionable close. */
export function buildDateDeck(p: DatePreferences, random: () => number = Math.random): number[] {
  const pool = eligibleCards(p).map(card => ({ ...card, sort: random() }));
  const opening = pool.filter(c => c.heat === 0 && c.depth === 0 && ![8, 33, 52].includes(c.id))
    .sort((a, b) => a.sort - b.sort)[0];
  const closing = pool.filter(c => [8, 33, 52].includes(c.id)).sort((a, b) => a.sort - b.sort)[0];
  const middle = pool.filter(c => c.id !== opening.id && c.id !== closing.id)
    .sort((a, b) => Number(b.mood === p.mood) - Number(a.mood === p.mood) || a.sort - b.sort)
    .slice(0, cardCount(p) - 2)
    // Warm up gradually, without making every session an escalation ladder.
    .sort((a, b) => a.heat - b.heat || a.sort - b.sort);
  return [opening.id, ...middle.map(c => c.id), closing.id];
}

/** Treat model output and restored browser state as untrusted. */
export function validateDateDeck(value: unknown, p: DatePreferences): value is number[] {
  if (!Array.isArray(value) || value.length !== cardCount(p)) return false;
  const allowed = new Set(eligibleCards(p).map(c => c.id));
  if (new Set(value).size !== value.length || !value.every(id => Number.isInteger(id) && allowed.has(id))) return false;
  const first = DATE_CARDS[value[0]];
  return first.heat === 0 && first.depth === 0 && [8, 33, 52].includes(value[value.length - 1]);
}

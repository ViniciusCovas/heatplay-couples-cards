/** Transport-independent session rules: no browser, clock or network dependencies. */
export type VariationKind = 'conversation' | 'guess' | 'match' | 'action' | 'closing';
export const previewSequence: readonly VariationKind[] = ['conversation', 'guess', 'conversation', 'match', 'conversation', 'action', 'conversation', 'closing'];
export type ChoicePhase = 'first' | 'handoff' | 'second' | 'reveal' | 'result';
export interface ChoiceState { phase: ChoicePhase; first: string[]; second: string[] }
export const emptyChoices = (): ChoiceState => ({ phase: 'first', first: [], second: [] });
export type ChoiceEvent = { type: 'submit'; choices: string[] } | { type: 'accept-handoff' } | { type: 'reveal' };
export function advanceChoices(state: ChoiceState, event: ChoiceEvent, allowed: readonly string[], multiple: boolean): ChoiceState {
  if (event.type === 'accept-handoff') return state.phase === 'handoff' ? { ...state, phase: 'second' } : state;
  if (event.type === 'reveal') return state.phase === 'reveal' ? { ...state, phase: 'result' } : state;
  const values = [...new Set(event.choices)];
  if (!values.length || values.some(value => !allowed.includes(value)) || (!multiple && values.length !== 1)) return state;
  if (state.phase === 'first') return { phase: 'handoff', first: values, second: [] };
  if (state.phase === 'second') return { ...state, phase: 'reveal', second: values };
  return state;
}
/** Shared UI never receives unmatched preferences. */
export function sharedChoices(state: ChoiceState): string[] {
  return state.phase === 'result' ? state.first.filter(value => state.second.includes(value)) : [];
}
export interface SessionMoment { id: string; question: string }
export function keepsakeText(moment: SessionMoment, language: string): string {
  const title = ({ es: 'Un momento nuestro', pt: 'Um momento nosso', en: 'A moment of ours', fr: 'Un moment à nous' } as Record<string, string>)[language.split('-')[0]] ?? 'A moment of ours';
  return `Let’s Get Close\n${title}\n\n${moment.question}\n\nletsgetclose.com\n`;
}
export interface VariationOutcome { kind: 'guess' | 'match'; sharedOptionIds: string[]; predictionMatched?: boolean }
export function variationOutcome(kind: 'guess' | 'match', state: ChoiceState): VariationOutcome | null {
  if (state.phase !== 'result') return null;
  return { kind, sharedOptionIds: sharedChoices(state), ...(kind === 'guess' ? { predictionMatched: state.first[0] === state.second[0] } : {}) };
}

/** Shared policy foundation, not wired to the live selector yet.
 * Runtime validation and authorization belong at the server boundary.
 * Time, emoji appearance and skipped feedback cannot authorize escalation.
 */
export interface RoundPreference {
  evidenceId: string;
  participantId: string;
  roundId: string;
  feeling: 'closer' | 'discovery' | 'desire' | 'uncomfortable' | null;
  pace: 'lighter' | 'same' | 'deeper' | null;
}
export interface PolicyCard {
  id: string;
  level: number;
  emotionalDepth: number;
  topics: string[];
}
interface PolicyInput {
  roundId: string;
  participants: readonly [string, string];
  feedback: readonly RoundPreference[];
  currentDepth: number;
  levelCeiling: number;
  blockedTopics: readonly string[];
  usedCardIds: readonly string[];
  candidates: readonly PolicyCard[];
}
export interface RoundDecision {
  action: 'hold' | 'soften' | 'deepen' | 'pause';
  reason: 'maintain' | 'comfort' | 'mutual-request' | 'no-eligible-card' | 'invalid-state';
  candidateIds: string[];
  /** Internal evidence references. Never expose who requested a softer pace. */
  evidenceIds: string[];
}

export function decideRound(input: PolicyInput): RoundDecision {
  const pause = (reason: RoundDecision['reason'], evidenceIds: string[] = []): RoundDecision => ({ action: 'pause', reason, candidateIds: [], evidenceIds });
  if (input.participants.length !== 2 || !input.participants[0] || !input.participants[1] || input.participants[0] === input.participants[1]
    || !Number.isInteger(input.currentDepth) || input.currentDepth < 0 || input.currentDepth > 3
    || !Number.isInteger(input.levelCeiling) || input.levelCeiling < 1 || input.levelCeiling > 4) return pause('invalid-state');
  const signals = input.feedback.filter(signal => signal.roundId === input.roundId && input.participants.includes(signal.participantId));
  // Persist one upserted response per person/round. Ambiguous duplicates fail closed.
  if (new Set(signals.map(signal => signal.participantId)).size !== signals.length
    || signals.some(signal => !signal.evidenceId)
    || new Set(signals.map(signal => signal.evidenceId)).size !== signals.length) return pause('invalid-state');
  const soften = signals.some(signal => signal.feeling === 'uncomfortable' || signal.pace === 'lighter');
  const deepen = !soften && signals.length === 2 && signals.every(signal => signal.pace === 'deeper');
  const action = soften ? 'soften' : deepen ? 'deepen' : 'hold';
  const maxDepth = Math.max(0, Math.min(3, input.currentDepth + (soften ? -1 : deepen ? 1 : 0)));
  const evidenceIds = signals.filter(signal => soften ? signal.feeling === 'uncomfortable' || signal.pace === 'lighter' : deepen ? signal.pace === 'deeper' : signal.feeling !== null || signal.pace !== null).map(signal => signal.evidenceId);
  const used = new Set(input.usedCardIds);
  const blocked = new Set(input.blockedTopics);
  const candidateIds = [...new Set(input.candidates.filter(card => card.id && !used.has(card.id)
    && Number.isInteger(card.level) && card.level >= 1 && card.level <= input.levelCeiling
    && Number.isInteger(card.emotionalDepth) && card.emotionalDepth >= 0 && card.emotionalDepth <= maxDepth
    && !card.topics.some(topic => blocked.has(topic))).map(card => card.id))];
  if (!candidateIds.length) return pause('no-eligible-card', evidenceIds);
  return { action, reason: soften ? 'comfort' : deepen ? 'mutual-request' : 'maintain', candidateIds, evidenceIds };
}

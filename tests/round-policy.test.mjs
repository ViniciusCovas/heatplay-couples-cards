import test from 'node:test';
import assert from 'node:assert/strict';
import { decideRound } from '../supabase/functions/_shared/round-policy.ts';
const signal = (participantId, pace, feeling = null, roundId = 'r1') => ({ evidenceId: `${roundId}:${participantId}`, participantId, roundId, feeling, pace });
const state = (feedback = []) => ({
  roundId: 'r1', participants: ['a', 'b'], feedback, currentDepth: 1, levelCeiling: 2,
  blockedTopics: ['family'], usedCardIds: ['seen'],
  candidates: [
    { id: 'light', level: 1, emotionalDepth: 0, topics: ['play'] },
    { id: 'current', level: 2, emotionalDepth: 1, topics: ['memories'] },
    { id: 'deep', level: 2, emotionalDepth: 2, topics: ['dreams'] },
    { id: 'too-sexy', level: 3, emotionalDepth: 0, topics: ['desire'] },
    { id: 'excluded-topic', level: 1, emotionalDepth: 0, topics: ['family'] },
    { id: 'seen', level: 1, emotionalDepth: 0, topics: ['play'] },
  ],
});

test('desire, silence and a unilateral request cannot escalate', () => {
  for (const feedback of [[], [signal('a', 'deeper', 'desire')], [signal('a', 'deeper'), signal('b', null)], [signal('a', 'deeper'), signal('b', 'same')]]) {
    const result = decideRound(state(feedback));
    assert.equal(result.action, 'hold');
    assert.deepEqual(result.candidateIds, ['light', 'current']);
  }
});
test('either partner can lower the pace even against a request to deepen', () => {
  for (const feedback of [[signal('a', 'deeper'), signal('b', 'lighter')], [signal('a', 'deeper', 'uncomfortable'), signal('b', 'deeper')]]) {
    const result = decideRound(state(feedback));
    assert.equal(result.action, 'soften');
    assert.deepEqual(result.candidateIds, ['light']);
  }
});
test('mutual deepening opens emotional depth but never exceeds content level or topic limits', () => {
  const result = decideRound(state([signal('a', 'deeper'), signal('b', 'deeper')]));
  assert.equal(result.action, 'deepen');
  assert.deepEqual(result.candidateIds, ['light', 'current', 'deep']);
  assert.deepEqual(result.evidenceIds, ['r1:a', 'r1:b']);
});
test('stale rounds and third-party signals do not count as agreement', () => {
  const result = decideRound(state([signal('a', 'deeper'), signal('b', 'deeper', null, 'old'), signal('outsider', 'deeper')]));
  assert.equal(result.action, 'hold');
  assert.ok(!result.candidateIds.includes('deep'));
});
test('exhausted catalog pauses instead of silently relaxing limits', () => {
  const input = state([signal('a', 'lighter')]);
  input.usedCardIds.push('light');
  assert.equal(decideRound(input).action, 'pause');
  assert.deepEqual(decideRound(input).candidateIds, []);
});
test('duplicate feedback, invalid levels and duplicate identities fail closed', () => {
  assert.equal(decideRound(state([signal('a', 'deeper'), signal('a', 'deeper')])).reason, 'invalid-state');
  assert.equal(decideRound({ ...state(), participants: ['a', 'a'] }).reason, 'invalid-state');
  assert.equal(decideRound({ ...state(), levelCeiling: 5 }).reason, 'invalid-state');
});

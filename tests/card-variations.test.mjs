import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceChoices, emptyChoices, sharedChoices, variationOutcome, previewSequence, keepsakeText } from '../src/lib/cardVariations.ts';
const ids = ['walk', 'dinner', 'dance', 'home'];
const step = (state, event, multiple = true) => advanceChoices(state, event, ids, multiple);

test('private selections cannot reveal before handoff and both submissions', () => {
  let state = emptyChoices();
  assert.equal(step(state, { type: 'reveal' }), state);
  state = step(state, { type: 'submit', choices: ['walk', 'home'] });
  assert.equal(state.phase, 'handoff');
  assert.deepEqual(sharedChoices(state), []);
  assert.equal(variationOutcome('match', state), null);
  assert.equal(step(state, { type: 'submit', choices: ['dance'] }), state);
  state = step(state, { type: 'accept-handoff' });
  state = step(state, { type: 'submit', choices: ['home', 'dinner'] });
  assert.deepEqual(sharedChoices(state), []);
  state = step(state, { type: 'reveal' });
  assert.deepEqual(sharedChoices(state), ['home']);
  assert.deepEqual(variationOutcome('match', state), { kind: 'match', sharedOptionIds: ['home'] });
  assert.equal(step(state, { type: 'submit', choices: ['walk'] }), state);
});
test('invalid choices and multiple predictions are rejected; duplicates are normalized', () => {
  const initial = emptyChoices();
  for (const choices of [[], ['unknown'], ['walk', 'dinner']]) assert.equal(step(initial, { type: 'submit', choices }, false), initial);
  assert.deepEqual(step(initial, { type: 'submit', choices: ['walk', 'walk'] }).first, ['walk']);
});
test('guessing disagreement is a factual outcome, not a relationship score', () => {
  let state = step(emptyChoices(), { type: 'submit', choices: ['walk'] }, false);
  state = step(state, { type: 'accept-handoff' }, false);
  state = step(state, { type: 'submit', choices: ['dinner'] }, false);
  state = step(state, { type: 'reveal' }, false);
  assert.deepEqual(variationOutcome('guess', state), { kind: 'guess', sharedOptionIds: [], predictionMatched: false });
});
test('special rounds are separated by conversations and the session ends with a keepsake', () => {
  assert.equal(previewSequence[0], 'conversation');
  for (let i=0;i<previewSequence.length-2;i++) assert.ok(previewSequence[i] === 'conversation' || previewSequence[i+1] === 'conversation');
  assert.equal(previewSequence.at(-1), 'closing');
});
test('a keepsake contains only the selected question, without participant data or answers', () => {
  const result = keepsakeText({ id: '22', question: 'Our question?', privateAnswer: 'secret', participant: 'private-name' }, 'es-MX');
  assert.ok(result.includes('Un momento nuestro'));
  assert.ok(result.includes('Our question?'));
  assert.ok(!result.includes('secret') && !result.includes('private-name'));
});

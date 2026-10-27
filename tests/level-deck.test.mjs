import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLevelDeck, cardContext, feedbackComplete } from '../src/lib/levelDeck.ts';

test('each level has complete localized questions, followups, and valid choice labels', () => {
  for (const lang of ['es', 'en', 'pt', 'fr']) {
    const locale = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8'));
    const prompts = new Set();
    for (const level of [1, 2, 3, 4]) {
      const content = locale.variations.levels[level];
      for (const index of [0, 1, 2, 3]) {
        assert.ok(content.questions[index]?.length > 15);
        assert.ok(content.followups[index]?.length > 15);
      }
      for (const kind of ['guess', 'match']) {
        assert.equal(Object.keys(getLevelDeck(level)[kind]).length, 4);
        for (const id of Object.keys(getLevelDeck(level)[kind])) assert.ok(content[`${kind}Options`][id]?.length > 2);
        assert.ok(!prompts.has(content[`${kind}Title`]));
        prompts.add(content[`${kind}Title`]);
      }
      assert.ok(content.actionTitle && content.actionBody);
    }
  }
});
test('prediction evidence remains scoped to catalog, level and topic', () => {
  assert.notEqual(cardContext(1, 'guess').cardKey, cardContext(4, 'guess').cardKey);
  assert.notEqual(cardContext(2, 'guess').topic, cardContext(3, 'guess').topic);
  for (const invalid of [0, 5, 1.5, NaN]) assert.throws(() => getLevelDeck(invalid));
});
test('completed feedback requires explicit valid feeling and pace, including discomfort', () => {
  for (const signal of [{ feeling: null, pace: null }, { feeling: 'closer', pace: null }, { feeling: null, pace: 'same' }, { feeling: 'unknown', pace: 'same' }]) assert.equal(feedbackComplete(signal), false);
  assert.equal(feedbackComplete({ feeling: 'uncomfortable', pace: 'lighter' }), true);
  assert.equal(feedbackComplete({ feeling: 'closer', pace: 'same' }), true);
});

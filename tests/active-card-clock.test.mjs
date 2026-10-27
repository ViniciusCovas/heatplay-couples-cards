import test from 'node:test';
import assert from 'node:assert/strict';
import { ActiveCardClock } from '../src/lib/activeCardClock.ts';

test('card exposure excludes overlays, hidden time and repeated focus events', () => {
  const clock = new ActiveCardClock();
  assert.equal(clock.read(500), 0);
  clock.resume(1000);
  clock.resume(1200);
  assert.equal(clock.read(2500), 1500);
  clock.pause(3000);
  clock.pause(4000);
  assert.equal(clock.read(60000), 2000);
  clock.resume(60000);
  clock.pause(61000);
  assert.equal(clock.read(90000), 3000);
  assert.equal(new ActiveCardClock().read(90000), 0);
});

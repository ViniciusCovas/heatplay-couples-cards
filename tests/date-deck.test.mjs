import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
// Node's TypeScript stripper supports the production shared modules. Resolve
// frontend extensionless imports just as Vite does; no second implementation.
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
}});
const { buildDateDeck, validateDateDeck, DATE_CARDS, isPreferences } = await import('../supabase/functions/_shared/date-deck.ts');
const { restoreSession } = await import('../src/lib/togetherSession.ts');
const { QUESTIONS } = await import('../supabase/functions/_shared/spark-questions.ts');

const combinations = [];
for (const mood of ['playful','close','flirty']) for (const minutes of [10,20,40]) for (const heat of [0,1,2]) for (const depth of [0,1]) combinations.push({mood,minutes,heat,depth});

test('all 54 preference combinations yield complete, unique, bounded decks', () => {
  for (const p of combinations) for (let n=0;n<30;n++) {
    const cards=buildDateDeck(p);
    assert.ok(validateDateDeck(cards,p), JSON.stringify(p));
    assert.ok(cards.every(id => DATE_CARDS[id].heat <= p.heat && DATE_CARDS[id].depth <= p.depth));
  }
});
test('model output cannot invent cards, duplicate them or cross boundaries', () => {
  const p=combinations[0], cards=buildDateDeck(p);
  assert.equal(validateDateDeck([...cards.slice(1), 999],p),false);
  assert.equal(validateDateDeck(cards.map(()=>cards[0]),p),false);
  assert.equal(validateDateDeck([51,...cards.slice(1)],p),false);
  assert.equal(validateDateDeck(cards.slice(1),p),false);
  assert.equal(validateDateDeck(cards.map(String),p),false);
  for(const bad of [null,{}, {mood:'flirty',minutes:10,heat:99,depth:0}, {mood:'close',minutes:'10',heat:0,depth:0}]) assert.equal(isPreferences(bad),false);
});
test('all languages provide the same complete question catalog and UI keys',async()=>{
  const en=JSON.parse(await readFile(new URL('../src/i18n/locales/en.json',import.meta.url),'utf8')).together;
  for(const locale of ['en','es','pt','fr']) {
    assert.equal(QUESTIONS[locale].length,60);
    assert.ok(QUESTIONS[locale].every(q=>q.trim().length>10));
    const actual=JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}.json`,import.meta.url),'utf8')).together;
    assert.deepEqual(Object.keys(actual).sort(),Object.keys(en).sort());
  }
});
test('reload restores progress; malformed, expired, future or unsafe sessions fail closed',()=>{
  const now=Date.now(), p=combinations[0];
  const s={version:1,createdAt:now,preferences:p,cards:buildDateDeck(p),index:2,revealed:true,favorites:[],source:'editorial'};
  assert.deepEqual(restoreSession(JSON.stringify(s),now),s);
  for (const patch of [{createdAt:now-9*3600000},{createdAt:now+1},{index:-1},{index:999},{favorites:[999]},{source:'invented'},{cards:[51,51,51,51,51,51]}]) assert.equal(restoreSession(JSON.stringify({...s,...patch}),now),null);
  assert.equal(restoreSession('{'),null);
});

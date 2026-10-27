import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupabaseConfig, SupabaseConfigError } from '../src/lib/supabaseConfig.ts';

const ref = 'abcdefghijklmnopqrst';
const otherRef = 'zyxwvutsrqponmlkjihg';
const url = `https://${ref}.supabase.co`;
// Synthetic test values, never credentials from a real project.
const publicKey = 'sb_publishable_synthetic_browser_fixture';
const env = { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: publicKey };
const jwt = claims => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify(claims)).toString('base64url'),
  Buffer.from('synthetic-signature-not-valid-for-auth').toString('base64url'),
].join('.');
const rejects = (input, code, options) => assert.throws(
  () => resolveSupabaseConfig(input, options),
  error => error instanceof SupabaseConfigError && error.code === code,
);

test('missing deployment values fail rather than choosing a default project', () => {
  rejects({}, 'missing_url');
  rejects({ ...env, VITE_SUPABASE_URL: ' ' }, 'missing_url');
  rejects({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: '' }, 'missing_key');
});

test('public key migration accepts modern publishable and matching legacy anon keys', () => {
  const modern = resolveSupabaseConfig({ ...env, VITE_SUPABASE_URL: `${url}/`, VITE_SUPABASE_PROJECT_ID: ref });
  assert.equal(modern.url, url);
  assert.equal(modern.publishableKey, publicKey);
  assert.equal(modern.projectRef, ref);
  const legacyKey = jwt({ role: 'anon', ref });
  assert.equal(resolveSupabaseConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey }).publishableKey, legacyKey);
});

test('swapped project URLs, expected refs and legacy keys are rejected before connection', () => {
  rejects({ ...env, VITE_SUPABASE_PROJECT_ID: otherRef }, 'project_mismatch');
  rejects({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon', ref: otherRef }) }, 'project_mismatch');
  rejects({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon' }) }, 'project_mismatch');
});

test('privileged keys and user JWTs cannot be mistaken for public app configuration', () => {
  for (const key of ['sb_secret_synthetic_do_not_publish', jwt({ role: 'service_role', ref }), jwt({ role: 'authenticated', ref, sub: 'test-user' }), jwt({ ref })]) {
    rejects({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: key }, 'unsafe_key');
  }
  for (const key of ['not-a-key', 'sb_publishable_', 'abc.%%%.xyz', 'a.b.c', 'one.two']) {
    rejects({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: key }, 'invalid_key');
  }
});

test('only canonical secure project endpoints are accepted outside local development', () => {
  for (const invalid of [
    'not-a-url', url.replace('https:', 'http:'), `${url}.attacker.test`,
    `https://${ref}.supabase.co.attacker.test`, `https://user:password@${ref}.supabase.co`,
    `${url}/rest/v1`, `${url}?token=private`, `${url}#fragment`, `${url}:8443`,
    'http://localhost:54321', 'https://example.com',
  ]) rejects({ ...env, VITE_SUPABASE_URL: invalid }, 'invalid_url');
});

test('local development requires explicit permission and cannot impersonate a hosted project', () => {
  for (const localUrl of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) {
    const localEnv = { ...env, VITE_SUPABASE_URL: localUrl };
    rejects(localEnv, 'invalid_url');
    assert.equal(resolveSupabaseConfig(localEnv, { allowLocal: true }).url, localUrl);
    rejects({ ...localEnv, VITE_SUPABASE_PROJECT_ID: ref }, 'project_mismatch', { allowLocal: true });
  }
  rejects({ ...env, VITE_SUPABASE_URL: 'http://localhost.attacker.test:54321' }, 'invalid_url', { allowLocal: true });
});

test('configuration errors never expose submitted keys, URL credentials or query values', () => {
  const sensitiveValues = [
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_do_not_echo_this' },
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'service_role', ref }) },
    { ...env, VITE_SUPABASE_URL: 'https://user:never_echo_password@invalid.test/?token=never_echo_token' },
  ];
  for (const input of sensitiveValues) {
    assert.throws(() => resolveSupabaseConfig(input), error => {
      const diagnostic = `${error.message}\n${error.stack}\n${JSON.stringify(error)}`;
      assert.ok(!diagnostic.includes(input.VITE_SUPABASE_PUBLISHABLE_KEY));
      assert.ok(!diagnostic.includes(input.VITE_SUPABASE_URL));
      assert.ok(!diagnostic.includes('never_echo_password'));
      assert.ok(!diagnostic.includes('never_echo_token'));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('separate deployments resolve independently without mutating or caching environment values', () => {
  const source = Object.freeze({ ...env });
  const first = resolveSupabaseConfig(source);
  const second = resolveSupabaseConfig({ ...env, VITE_SUPABASE_URL: `https://${otherRef}.supabase.co` });
  assert.equal(first.projectRef, ref);
  assert.equal(second.projectRef, otherRef);
  assert.equal(resolveSupabaseConfig(source).url, first.url);
  assert.equal(source.VITE_SUPABASE_URL, url);
});

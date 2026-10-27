/** Public browser configuration only. This module never reads global env/storage. */
export interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
}

export interface SupabaseBrowserConfig {
  readonly url: string;
  readonly publishableKey: string;
  readonly projectRef: string | null;
}

export type SupabaseConfigErrorCode = 'missing_url' | 'invalid_url' | 'missing_key' | 'unsafe_key' | 'invalid_key' | 'project_mismatch';

export class SupabaseConfigError extends Error {
  readonly code: SupabaseConfigErrorCode;

  constructor(code: SupabaseConfigErrorCode, message: string) {
    super(`Supabase configuration: ${message}`);
    this.name = 'SupabaseConfigError';
    this.code = code;
  }
}

function fail(code: SupabaseConfigErrorCode, message: string): never {
  // Never include configuration values or original parsing errors: those may
  // contain a mistakenly supplied server secret, credentials, or URL query.
  throw new SupabaseConfigError(code, message);
}

/**
 * Guards against deployment mistakes, not a substitute for server-side JWT
 * verification or RLS. Modern publishable keys are opaque; their project can
 * only be verified by Supabase. Use the optional project ID to pin the URL.
 */
export function resolveSupabaseConfig(
  env: SupabaseEnvironment,
  options: { allowLocal?: boolean } = {},
): SupabaseBrowserConfig {
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  if (!rawUrl) fail('missing_url', 'Set VITE_SUPABASE_URL before enabling online features.');

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return fail('invalid_url', 'VITE_SUPABASE_URL must be a canonical HTTPS Supabase project URL.');
  }
  const hostedRef = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname)?.[1] ?? null;
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const hosted = hostedRef !== null && url.protocol === 'https:' && !url.port;
  const local = options.allowLocal === true && isLocal && ['http:', 'https:'].includes(url.protocol);
  if ((!hosted && !local) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    fail('invalid_url', 'Use the canonical HTTPS Supabase project URL, without credentials, paths, or query parameters. Loopback URLs are allowed only in development.');
  }

  const expectedRef = env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (expectedRef && (!hostedRef || expectedRef !== hostedRef)) {
    fail('project_mismatch', 'VITE_SUPABASE_PROJECT_ID does not match the configured project URL.');
  }

  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!publishableKey) fail('missing_key', 'Set VITE_SUPABASE_PUBLISHABLE_KEY to a public publishable key or legacy anon key.');
  if (publishableKey.startsWith('sb_secret_')) {
    fail('unsafe_key', 'Server secret keys must never be placed in VITE_ variables. Use a public publishable key.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    const parts = publishableKey.split('.');
    let claims: unknown;
    try {
      if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    } catch {
      return fail('invalid_key', 'Use a public sb_publishable_ key or a valid legacy anon JWT.');
    }
    if (!claims || typeof claims !== 'object' || !('role' in claims) || claims.role !== 'anon') {
      fail('unsafe_key', 'Only legacy anon JWT keys are allowed in the browser. Server keys and user access tokens are not application configuration.');
    }
    // Hosted legacy API keys include their project ref. Requiring that match
    // catches swapped deployment values before an auth/network request occurs.
    if (hostedRef && (!('ref' in claims) || claims.ref !== hostedRef)) {
      fail('project_mismatch', 'The legacy anon key belongs to a different project than VITE_SUPABASE_URL.');
    }
  }

  return Object.freeze({ url: url.origin, publishableKey, projectRef: hostedRef });
}

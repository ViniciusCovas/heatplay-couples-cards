/**
 * Shared CORS handling for all edge functions.
 *
 * Instead of the previous wildcard ("Access-Control-Allow-Origin: *"), the
 * allowed origins are read from the ALLOWED_ORIGINS edge-function secret
 * (comma-separated list), falling back to the production domain and local
 * dev servers.
 *
 * Set it with:
 *   supabase secrets set ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://letsgetclose.com",
  "https://www.letsgetclose.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const parsed = raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o.length > 0);
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Build CORS headers for a request. If the request Origin is in the allow
 * list it is echoed back; otherwise the first allowed origin is returned,
 * which means browsers on unknown origins cannot read responses.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && allowed.includes(origin.replace(/\/+$/, ""))
    ? origin
    : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-internal-secret, x-requested-with, accept, accept-language, cache-control, pragma",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

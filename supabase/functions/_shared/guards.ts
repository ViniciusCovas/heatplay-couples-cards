/**
 * Shared authorization guards for edge functions.
 *
 * The game supports anonymous partners (no JWT - the client calls functions
 * with the project's anon key as the bearer token), so per-user auth is not
 * always possible. These helpers implement the layered checks used instead:
 *
 *  - requireInternalSecret: for functions that must only be called from
 *    inside the platform (DB trigger / pg_cron), authenticated by the
 *    INTERNAL_FUNCTION_SECRET shared secret.
 *  - getCallerUser: resolves the Authorization bearer to a real user when
 *    there is one (returns null for the anon key / invalid tokens).
 *  - checkRoomAccess: validates that a roomId is a real, recently active
 *    room and - when the caller is an identified user - that they are the
 *    host or a participant of it.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Service-role client (bypasses RLS - use only after authorization checks). */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Constant-time-ish comparison of the x-internal-secret header against the
 * INTERNAL_FUNCTION_SECRET env secret. Fails closed when the secret is not
 * configured.
 */
export function requireInternalSecret(req: Request): { ok: boolean; error?: string } {
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!expected) {
    return {
      ok: false,
      error: "INTERNAL_FUNCTION_SECRET is not configured for this function",
    };
  }
  const provided = req.headers.get("x-internal-secret") ?? "";
  if (provided.length !== expected.length) return { ok: false, error: "Forbidden" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, error: "Forbidden" };
}

/**
 * Resolve the Authorization header to a real authenticated user, or null when
 * the caller is anonymous (anon key) or the token is invalid.
 */
export async function getCallerUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  if (token === anonKey) return null; // anonymous caller using the public key

  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch (_e) {
    return null;
  }
}

export interface RoomAccessResult {
  ok: boolean;
  status: number;
  error?: string;
  room?: Record<string, unknown>;
}

/**
 * Validate access to a room for game-scoped functions.
 *
 * - roomId must be a syntactically valid UUID of an existing room.
 * - Identified callers must be the host or a registered participant.
 * - Anonymous callers (anon key) are allowed only while the room is in the
 *   "recently active" window (waiting/playing, or finished within
 *   maxAgeHours). This mirrors the RLS policy room_is_recently_active() and
 *   means historical rooms can never be queried anonymously.
 */
export async function checkRoomAccess(
  supabase: SupabaseClient,
  roomId: unknown,
  callerUserId: string | null,
  opts: { requireActive?: boolean; maxAgeHours?: number } = {},
): Promise<RoomAccessResult> {
  const { requireActive = false, maxAgeHours = 24 } = opts;

  if (!isUuid(roomId)) {
    return { ok: false, status: 400, error: "Invalid roomId" };
  }

  const { data: room, error } = await supabase
    .from("game_rooms")
    .select("id, status, host_user_id, created_at, finished_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: "Room lookup failed" };
  if (!room) return { ok: false, status: 404, error: "Room not found" };

  const isActive = room.status === "waiting" || room.status === "playing";
  if (requireActive && !isActive) {
    return { ok: false, status: 403, error: "Room is not active" };
  }

  if (callerUserId) {
    // Identified caller: must be host or participant of this room.
    if (room.host_user_id === callerUserId) return { ok: true, status: 200, room };

    const { data: participant } = await supabase
      .from("room_participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("player_id", callerUserId)
      .maybeSingle();

    if (!participant) {
      return { ok: false, status: 403, error: "Not a participant of this room" };
    }
    return { ok: true, status: 200, room };
  }

  // Anonymous caller: only recently active rooms are reachable.
  const referenceTs = room.finished_at ?? room.created_at;
  const recent = referenceTs
    ? Date.now() - new Date(referenceTs as string).getTime() < maxAgeHours * 3600 * 1000
    : false;

  if (!isActive && !recent) {
    return { ok: false, status: 403, error: "Room is no longer accessible" };
  }
  return { ok: true, status: 200, room };
}

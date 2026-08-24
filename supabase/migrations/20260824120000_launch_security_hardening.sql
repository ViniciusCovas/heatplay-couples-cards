-- ============================================================================
-- LAUNCH SECURITY HARDENING
-- ============================================================================
-- This migration consolidates and replaces the permissive RLS policies that
-- accumulated during development (USING (true) SELECTs, anonymous writes with
-- no scoping, self-service admin escalation, publicly executable credit
-- functions) with a scoped, least-privilege model that still supports the
-- product's core flows:
--
--   * A signed-in host creates a room (create_room_and_join RPC).
--   * A partner joins by 6-char room code WITHOUT an account
--     (join_room_by_code RPC, SECURITY DEFINER). Anonymous players carry a
--     client-generated player_id (TEXT) and NO JWT, so RLS cannot verify an
--     anonymous identity. Anonymous access is therefore scoped by capability:
--     the client only learns a room's UUID by knowing its code, and policies
--     only expose rows of rooms that are currently active (or very recently
--     finished). Historical game data is never exposed to the anon role.
--   * Both players read/write responses, sync events, votes and connection
--     state for their room, and read the AI analysis of their room.
--   * Credits/payments are only ever mutated by SECURITY DEFINER functions
--     (consume_credit_for_room) or by the service role (Stripe webhook).
--
-- The migration is written to be idempotent-ish: it drops ALL existing
-- policies on the affected tables (there are dozens of historical names) and
-- recreates a single, documented set.
-- ============================================================================


-- ============================================================================
-- 0. HELPER FUNCTIONS (SECURITY DEFINER, used inside policies)
-- ============================================================================

-- True when the given player_id (auth uid as text, or an anonymous
-- client-generated id) is a participant of the room. SECURITY DEFINER so the
-- lookup is not itself subject to room_participants RLS (avoids recursion).
CREATE OR REPLACE FUNCTION public.player_participates_in_room(
  room_id_param uuid,
  player_id_param text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = room_id_param
      AND player_id = player_id_param
  );
$$;

-- True when the given auth user is the host of the room. Used by policies on
-- child tables (ai_analyses) without re-triggering game_rooms RLS.
CREATE OR REPLACE FUNCTION public.user_is_room_host(
  room_id_param uuid,
  user_id_param uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = room_id_param
      AND host_user_id = user_id_param
  );
$$;

-- The anonymous-access window. Anonymous (no-JWT) clients can only reach rows
-- belonging to rooms that are live right now, or that finished within the last
-- 24 hours (so the post-game analysis screen still works for the anonymous
-- partner). Old/archived rooms are invisible to the anon role, which is what
-- prevents trawling of historical intimate data.
CREATE OR REPLACE FUNCTION public.room_is_recently_active(room_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_rooms r
    WHERE r.id = room_id_param
      AND (
        r.status IN ('waiting', 'playing')
        OR COALESCE(r.finished_at, r.created_at) > now() - interval '24 hours'
      )
  );
$$;

-- The old "anonymous_can_access_room" helper was equivalent to "the room has
-- participants", i.e. forgeable/meaningless. Remove it so no future policy
-- resurrects it. (All policies referencing it are dropped below first, but
-- ordering in this file keeps the drop after the policy purge; CASCADE guards
-- against any straggler.)
-- NOTE: the actual DROP happens in section 2 after the policy purge.


-- ============================================================================
-- 1. STRIPE EVENTS TABLE (webhook idempotency ledger)
-- ============================================================================
-- Every credit grant coming from Stripe is recorded here exactly once, keyed
-- by Stripe event id, with a UNIQUE constraint on the checkout session id so
-- that the webhook and the verify-payment fallback can never both grant
-- credits for the same checkout session. Only the service role touches this
-- table (edge functions); RLS is enabled with NO policies so anon/authed
-- clients can never read or write it.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,           -- Stripe event id (evt_...) or synthetic "verify_<session_id>"
  session_id text UNIQUE,              -- Stripe checkout session id (cs_...): the idempotency key for grants
  event_type text NOT NULL,            -- e.g. 'checkout.session.completed'
  user_id uuid,                        -- user credited (from session metadata)
  credits_granted integer,             -- credits granted for this event
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only service_role (which bypasses RLS) may use it.
REVOKE ALL ON public.stripe_events FROM anon, authenticated;


-- ============================================================================
-- 2. PURGE ALL EXISTING POLICIES ON AFFECTED TABLES
-- ============================================================================
-- Dozens of policy names exist across historical migrations; enumerating them
-- is error-prone, so drop everything on the tables we are re-securing.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'game_rooms', 'room_participants', 'game_responses', 'game_sync',
        'level_selection_votes', 'connection_states', 'ai_analyses',
        'game_flow_queue', 'profiles', 'credits', 'sessions',
        'questions', 'levels'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END
$$;

-- Remove the forgeable helper now that no policy references it.
DROP FUNCTION IF EXISTS public.anonymous_can_access_room(uuid, text);

-- Make sure RLS is enabled everywhere (some past migrations disabled it).
ALTER TABLE public.game_rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_responses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sync             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_selection_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_states     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_flow_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels                ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. GAME_ROOMS
-- ============================================================================
-- App flows that must keep working:
--   * host (authenticated) creates via create_room_and_join RPC and reads it
--   * partner looks the room up BY EXACT CODE before/after joining
--   * both players update in-game state columns (phase, cards, turn, ...)
--   * realtime UPDATE events for the room must reach both players

-- Authenticated users see rooms they host or participate in; admins see all
-- (admin analytics dashboard).
CREATE POLICY "rooms_select_authenticated"
  ON public.game_rooms FOR SELECT
  TO authenticated
  USING (
    host_user_id = auth.uid()
    OR public.player_participates_in_room(id, auth.uid()::text)
    OR public.is_admin(auth.uid())
  );

-- Anonymous (no-JWT) clients: only rooms in the active window. They can only
-- learn a room UUID through the 6-char code (join_room_by_code / lookup by
-- exact code), and only live or just-finished rooms are visible at all.
CREATE POLICY "rooms_select_anon"
  ON public.game_rooms FOR SELECT
  TO anon
  USING (public.room_is_recently_active(id));

-- Only authenticated users create rooms, and only as themselves. (The RPC
-- also enforces this; the policy covers any direct insert.)
CREATE POLICY "rooms_insert_authenticated"
  ON public.game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (host_user_id = auth.uid());

-- Hosts and participants update in-game state. Column-level grants below
-- restrict WHICH columns are updatable (never room_code / host_user_id /
-- credit_status / session_id).
CREATE POLICY "rooms_update_authenticated"
  ON public.game_rooms FOR UPDATE
  TO authenticated
  USING (
    host_user_id = auth.uid()
    OR public.player_participates_in_room(id, auth.uid()::text)
  )
  WITH CHECK (
    host_user_id = auth.uid()
    OR public.player_participates_in_room(id, auth.uid()::text)
  );

-- The anonymous partner also drives shared game state (phase transitions,
-- current card, turn). Without a JWT this cannot be pinned to a person, so it
-- is scoped to the active-room window plus the column grants below.
CREATE POLICY "rooms_update_anon"
  ON public.game_rooms FOR UPDATE
  TO anon
  USING (public.room_is_recently_active(id))
  WITH CHECK (public.room_is_recently_active(id));

-- No DELETE policy: rooms are never deleted from the client.

-- Column-level privileges: clients may only update live game-state columns.
-- room_code, host_user_id, session_id, credit_status and selected_language are
-- controlled exclusively by SECURITY DEFINER RPCs.
REVOKE UPDATE, DELETE ON public.game_rooms FROM anon, authenticated;
GRANT UPDATE (
  status, current_phase, current_card, current_card_index, used_cards,
  current_turn, proximity_question_answered,
  player1_proximity_response, player2_proximity_response,
  started_at, finished_at
) ON public.game_rooms TO anon, authenticated;
REVOKE INSERT ON public.game_rooms FROM anon;


-- ============================================================================
-- 4. ROOM_PARTICIPANTS
-- ============================================================================
-- Joins ONLY happen through SECURITY DEFINER RPCs (create_room_and_join /
-- join_room_by_code), which validate the room code, capacity and player
-- number atomically. Direct INSERT/UPDATE from clients is therefore denied
-- entirely - this closes the "anonymous can insert any player_id into any
-- room" hole while keeping the join-by-code flow fully working.

CREATE POLICY "participants_select_authenticated"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid()::text
    OR public.player_participates_in_room(room_id, auth.uid()::text)
    OR public.is_admin(auth.uid())
  );

-- Anonymous players must see both participant rows of their (active) room to
-- compute player numbers and readiness.
CREATE POLICY "participants_select_anon"
  ON public.room_participants FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

-- Authenticated users can remove THEIR OWN participation (leaveRoom).
-- Anonymous leave is intentionally not allowed at the RLS level (an anonymous
-- request cannot prove which participant it is, and allowing it would let
-- anyone eject players from a live room); the client already treats a failed
-- leave as non-fatal and rooms are cleaned up by their lifecycle.
CREATE POLICY "participants_delete_own"
  ON public.room_participants FOR DELETE
  TO authenticated
  USING (player_id = auth.uid()::text);

-- No INSERT / UPDATE policies: RPCs only.
REVOKE INSERT, UPDATE ON public.room_participants FROM anon, authenticated;
REVOKE DELETE ON public.room_participants FROM anon;


-- ============================================================================
-- 5. GAME_RESPONSES
-- ============================================================================
-- Both players write answers and evaluate each other's answers. Responses of
-- a room are only visible to that room's participants (authenticated) or, for
-- the anonymous partner, while the room is in the active window.

CREATE POLICY "responses_select_authenticated"
  ON public.game_responses FOR SELECT
  TO authenticated
  USING (
    public.player_participates_in_room(room_id, auth.uid()::text)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "responses_select_anon"
  ON public.game_responses FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

-- Authenticated players insert only as themselves and only into rooms they
-- participate in.
CREATE POLICY "responses_insert_authenticated"
  ON public.game_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()::text
    AND public.player_participates_in_room(room_id, player_id)
  );

-- Anonymous players insert with their client-generated player_id, which must
-- already be registered as a participant of an active room (i.e. they went
-- through join_room_by_code).
CREATE POLICY "responses_insert_anon"
  ON public.game_responses FOR INSERT
  TO anon
  WITH CHECK (
    public.player_participates_in_room(room_id, player_id)
    AND public.room_is_recently_active(room_id)
  );

-- Updates are only used for partner evaluation; the column grants below limit
-- updates to (evaluation, evaluation_by) so the answer text itself is
-- immutable once written.
CREATE POLICY "responses_update_authenticated"
  ON public.game_responses FOR UPDATE
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text))
  WITH CHECK (public.player_participates_in_room(room_id, auth.uid()::text));

CREATE POLICY "responses_update_anon"
  ON public.game_responses FOR UPDATE
  TO anon
  USING (
    public.room_is_recently_active(room_id)
    AND public.player_participates_in_room(room_id, player_id)
  )
  WITH CHECK (
    public.room_is_recently_active(room_id)
    AND public.player_participates_in_room(room_id, player_id)
  );

REVOKE UPDATE, DELETE ON public.game_responses FROM anon, authenticated;
GRANT UPDATE (evaluation, evaluation_by) ON public.game_responses TO anon, authenticated;


-- ============================================================================
-- 6. GAME_SYNC
-- ============================================================================

CREATE POLICY "sync_select_authenticated"
  ON public.game_sync FOR SELECT
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text));

CREATE POLICY "sync_select_anon"
  ON public.game_sync FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

CREATE POLICY "sync_insert_authenticated"
  ON public.game_sync FOR INSERT
  TO authenticated
  WITH CHECK (
    triggered_by = auth.uid()::text
    AND public.player_participates_in_room(room_id, triggered_by)
  );

CREATE POLICY "sync_insert_anon"
  ON public.game_sync FOR INSERT
  TO anon
  WITH CHECK (
    public.player_participates_in_room(room_id, triggered_by)
    AND public.room_is_recently_active(room_id)
  );

-- Sync events are append-only from the client.
REVOKE UPDATE, DELETE ON public.game_sync FROM anon, authenticated;


-- ============================================================================
-- 7. LEVEL_SELECTION_VOTES
-- ============================================================================
-- Votes are normally written through the handle_level_selection RPC
-- (SECURITY DEFINER); the client also deletes a room's votes when a level
-- change is requested.

CREATE POLICY "votes_select_authenticated"
  ON public.level_selection_votes FOR SELECT
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text));

CREATE POLICY "votes_select_anon"
  ON public.level_selection_votes FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

CREATE POLICY "votes_insert_authenticated"
  ON public.level_selection_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()::text
    AND public.player_participates_in_room(room_id, player_id)
  );

CREATE POLICY "votes_insert_anon"
  ON public.level_selection_votes FOR INSERT
  TO anon
  WITH CHECK (
    public.player_participates_in_room(room_id, player_id)
    AND public.room_is_recently_active(room_id)
  );

CREATE POLICY "votes_update_authenticated"
  ON public.level_selection_votes FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid()::text)
  WITH CHECK (player_id = auth.uid()::text);

-- Level-change flow deletes all votes of the room (both players' rows), so
-- the delete is scoped to the room, not the row owner.
CREATE POLICY "votes_delete_authenticated"
  ON public.level_selection_votes FOR DELETE
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text));

CREATE POLICY "votes_delete_anon"
  ON public.level_selection_votes FOR DELETE
  TO anon
  USING (public.room_is_recently_active(room_id));


-- ============================================================================
-- 8. CONNECTION_STATES
-- ============================================================================
-- Written through the sync_game_state_reliably RPC; policies allow reads for
-- room members and self-writes as a fallback.

CREATE POLICY "connections_select_authenticated"
  ON public.connection_states FOR SELECT
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text));

CREATE POLICY "connections_select_anon"
  ON public.connection_states FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

CREATE POLICY "connections_write_authenticated"
  ON public.connection_states FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()::text
    AND public.player_participates_in_room(room_id, player_id)
  );

CREATE POLICY "connections_update_authenticated"
  ON public.connection_states FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid()::text)
  WITH CHECK (player_id = auth.uid()::text);

CREATE POLICY "connections_write_anon"
  ON public.connection_states FOR INSERT
  TO anon
  WITH CHECK (
    public.player_participates_in_room(room_id, player_id)
    AND public.room_is_recently_active(room_id)
  );

CREATE POLICY "connections_update_anon"
  ON public.connection_states FOR UPDATE
  TO anon
  USING (
    public.player_participates_in_room(room_id, player_id)
    AND public.room_is_recently_active(room_id)
  )
  WITH CHECK (
    public.player_participates_in_room(room_id, player_id)
    AND public.room_is_recently_active(room_id)
  );

REVOKE DELETE ON public.connection_states FROM anon, authenticated;


-- ============================================================================
-- 9. AI_ANALYSES
-- ============================================================================
-- Written ONLY by the getclose-ai-analysis edge function (service role, which
-- bypasses RLS). Readable only by the room's host/participants - previously
-- ANY authenticated user could read EVERY couple's analysis (USING (true)).

CREATE POLICY "analyses_select_authenticated"
  ON public.ai_analyses FOR SELECT
  TO authenticated
  USING (
    public.user_is_room_host(room_id, auth.uid())
    OR public.player_participates_in_room(room_id, auth.uid()::text)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "analyses_select_anon"
  ON public.ai_analyses FOR SELECT
  TO anon
  USING (public.room_is_recently_active(room_id));

-- No INSERT/UPDATE/DELETE policies: service role only.
REVOKE INSERT, UPDATE, DELETE ON public.ai_analyses FROM anon, authenticated;


-- ============================================================================
-- 10. GAME_FLOW_QUEUE
-- ============================================================================
-- Populated and processed exclusively by SECURITY DEFINER functions and the
-- process-game-queue edge function (service role). Participants may observe
-- their room's queue; nobody else touches it.

CREATE POLICY "queue_select_authenticated"
  ON public.game_flow_queue FOR SELECT
  TO authenticated
  USING (public.player_participates_in_room(room_id, auth.uid()::text));

REVOKE INSERT, UPDATE, DELETE ON public.game_flow_queue FROM anon, authenticated;


-- ============================================================================
-- 11. PROFILES (admin-role hardening)
-- ============================================================================
-- The role column lives on profiles and previously the UPDATE policy had no
-- WITH CHECK and no column restriction, so any user could set role='admin' on
-- their own row. Fix:
--   * UPDATE is limited to the user's own row (USING + WITH CHECK), AND
--   * column-level privileges remove the ability to update `role` (and
--     `user_id`/`email`) at all from client roles. Role changes can only be
--     made by the service role or by promote_to_admin() below.

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- is_admin() is SECURITY DEFINER, so this does not recurse into profiles RLS.
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Client roles may only touch activity-tracking columns. `role` is excluded.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (last_seen, last_login, updated_at) ON public.profiles TO authenticated;


-- ============================================================================
-- 12. CREDITS AND SESSIONS
-- ============================================================================
-- Balances are only ever changed by SECURITY DEFINER functions
-- (consume_credit_for_room) or the service role (add_credits from the Stripe
-- webhook). Clients can only read their own rows.

CREATE POLICY "credits_select_own"
  ON public.credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.credits FROM anon, authenticated;

CREATE POLICY "sessions_select_own"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.sessions FROM anon, authenticated;


-- ============================================================================
-- 13. QUESTIONS AND LEVELS (public read-only content)
-- ============================================================================

CREATE POLICY "questions_select_active"
  ON public.questions FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "questions_admin_manage"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "levels_select_active"
  ON public.levels FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "levels_admin_manage"
  ON public.levels FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ============================================================================
-- 14. PRIVILEGED FUNCTIONS LOCKDOWN
-- ============================================================================

-- add_credits was SECURITY DEFINER and executable by any logged-in user via
-- PostgREST RPC - i.e. free credits for everyone. Only the service role
-- (Stripe webhook / verify-payment edge functions) may call it now.
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.add_credits(uuid, integer) TO service_role;

-- promote_to_admin had no caller check: any user could promote any email to
-- admin. It now requires the CALLER to already be an admin. Bootstrap the
-- first admin from the SQL editor (service role bypasses the check via a
-- direct UPDATE on profiles, or temporarily run as postgres).
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only existing admins may promote. auth.uid() is NULL for anon and for
  -- direct SQL (postgres/service_role callers should UPDATE profiles
  -- directly instead).
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: only admins can promote users';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'::public.app_role
  WHERE email = user_email;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated, service_role;


-- ============================================================================
-- 15. INTERNAL FUNCTION SECRET (for email/cron edge functions)
-- ============================================================================
-- send-welcome-email and send-reengagement-email must not be publicly
-- invokable. They are called from inside the database (auth.users trigger and
-- pg_cron) and now authenticate with a shared secret sent in the
-- "x-internal-secret" header. The secret is stored in Supabase Vault under
-- the name 'internal_function_secret' and must ALSO be set as the
-- INTERNAL_FUNCTION_SECRET edge-function secret (see supabase/DEPLOYMENT.md).

CREATE OR REPLACE FUNCTION public.get_internal_function_secret()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  s text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO s
    FROM vault.decrypted_secrets
    WHERE name = 'internal_function_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    s := NULL;  -- Vault not available / secret not created yet
  END;
  RETURN COALESCE(s, '');
END;
$$;

-- Never callable by client roles; the definer contexts (triggers, cron jobs
-- running as postgres) do not need a grant beyond the owner's.
REVOKE EXECUTE ON FUNCTION public.get_internal_function_secret() FROM PUBLIC, anon, authenticated;

-- Recreate the welcome-email trigger function: it no longer ships the anon
-- API key, and it authenticates to the edge function with the internal
-- secret. If the secret has not been provisioned yet the email is skipped
-- (signup must never fail because of email delivery).
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  internal_secret text;
BEGIN
  internal_secret := public.get_internal_function_secret();

  IF internal_secret = '' THEN
    RAISE LOG 'send_welcome_email_trigger: internal_function_secret not set in Vault; skipping welcome email';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', internal_secret
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'user_id', NEW.id::text,
        'created_at', NEW.created_at::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'send_welcome_email_trigger: failed to enqueue welcome email: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Re-point the cron jobs that call edge functions so they send the internal
-- secret (and stop embedding the anon API key in the database). pg_cron
-- "schedule" with an existing name replaces that job in place. All of this is
-- wrapped so the migration still applies on local stacks without pg_cron.
DO $$
BEGIN
  -- Weekly re-engagement campaign (Mondays 10:00 UTC).
  PERFORM cron.schedule(
    'send-reengagement-emails',
    '0 10 * * 1',
    $cron$
    SELECT net.http_post(
      url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/send-reengagement-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', public.get_internal_function_secret()
      ),
      body := '{"trigger": "cron"}'::jsonb
    );
    $cron$
  );

  -- Queue processor: keep ONE job (three overlapping jobs existed).
  PERFORM cron.schedule(
    'process-game-flow-queue',
    '*/30 * * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/process-game-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', public.get_internal_function_secret()
      ),
      body := '{"auto_process": true}'::jsonb
    );
    $cron$
  );

  -- Remove the redundant duplicates of the queue processor.
  BEGIN
    PERFORM cron.unschedule('realtime-game-queue-processor');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('auto-recovery-game-flow');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'launch_security_hardening: pg_cron not available, skipping cron updates (%)', SQLERRM;
END
$$;


-- ============================================================================
-- 16. DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.room_is_recently_active(uuid) IS
  'Anonymous-access window: true for rooms that are waiting/playing or finished/created within the last 24h. Anonymous (no-JWT) partners can only reach rows of such rooms; historical data is invisible to the anon role.';

COMMENT ON TABLE public.stripe_events IS
  'Idempotency ledger for Stripe credit grants. UNIQUE(session_id) guarantees a checkout session is credited at most once across the stripe-webhook and verify-payment paths. Service-role only.';

COMMENT ON FUNCTION public.promote_to_admin(text) IS
  'Promotes a user (by email) to admin. Caller must already be an admin; bootstrap the first admin via a direct UPDATE on public.profiles using the service role.';

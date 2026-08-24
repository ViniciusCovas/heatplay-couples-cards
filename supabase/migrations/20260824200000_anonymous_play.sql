-- ============================================================================
-- ANONYMOUS PLAY — make Supabase anonymous sign-in safe for the host flow
-- ============================================================================
-- Product change: the room HOST no longer has to create an account. When a
-- visitor hits /create-room without a session the client calls
-- supabase.auth.signInAnonymously(), so the host gets a REAL auth.uid() with
-- `is_anonymous = true` in its JWT. Later they can convert that same identity
-- into a permanent account with auth.updateUser({email, password}) — the uid
-- never changes, so their rooms, credits and analyses carry over.
--
-- IMPORTANT: anonymous *authenticated* users hold the `authenticated` Postgres
-- role, NOT `anon`. Every policy written against `TO authenticated` +
-- auth.uid() in 20260824120000_launch_security_hardening.sql therefore keeps
-- working for them unchanged — which is exactly what we want for play. The
-- `anon`-role policies (the no-JWT partner joining by code) are untouched.
--
-- AUDIT OF WHAT AN ANONYMOUS AUTHENTICATED USER NOW TOUCHES
-- ----------------------------------------------------------------------------
-- game_rooms
--   rooms_select_authenticated / rooms_insert_authenticated /
--   rooms_update_authenticated: all keyed on host_user_id = auth.uid() or
--   participation. Correct for a guest host. Column grants unchanged.
-- room_participants
--   participants_select_authenticated / participants_delete_own: keyed on
--   auth.uid()::text. create_room_and_join inserts auth.uid() as player 1
--   (SECURITY DEFINER). Works. usePlayerId already prefers the auth uid, so
--   the guest host's player_id matches their JWT.
-- game_responses / game_sync / level_selection_votes / connection_states /
-- game_flow_queue / ai_analyses
--   All scoped by player_participates_in_room(room_id, auth.uid()::text).
--   Works for guest hosts; grants no access to anything outside their room.
-- credits / sessions / subscriptions
--   SELECT own row only; no client writes. A guest simply has no rows -> 0
--   credits. Correct: the client sends them to finish the account before
--   checkout (Stripe needs a durable identity + an email for the receipt).
-- consume_credit_for_room()
--   Granted to `authenticated`, so guests may call it. It requires
--   host_user_id = auth.uid() and either credits >= 1 or has_premium(). A guest
--   has neither, so it returns insufficient_credits and the room stays
--   pending_credit. No privilege gained, no bypass. Left unchanged.
-- has_premium()
--   Pure lookup in subscriptions by user_id/partner_user_id; a guest matches
--   nothing -> false. Left unchanged.
-- is_admin() / promote_to_admin() / questions_admin_manage /
-- levels_admin_manage
--   Driven by profiles.role, which handle_new_user always sets to 'user'.
--   Hardened below anyway (defence in depth) so no anonymous JWT can ever be
--   an admin or promote anyone.
-- add_credits()
--   Already revoked from anon/authenticated (service_role only). Unchanged.
--
-- GAPS FOUND AND FIXED BY THIS MIGRATION
-- ----------------------------------------------------------------------------
-- (1) BLOCKER: public.handle_new_user() inserts NEW.email into
--     public.profiles.email, which is NOT NULL. auth.users.email is NULL for
--     anonymous sign-ups, so the trigger would raise and Supabase would fail
--     signInAnonymously() outright. Fixed with COALESCE(NEW.email, '') plus an
--     ON CONFLICT guard.
-- (2) The upgrade path (updateUser -> email set on auth.users) never wrote the
--     new address back to profiles.email, leaving the row at ''. Added a
--     trigger on auth.users UPDATE that syncs it.
-- (3) promote_to_admin(user_email) matched `WHERE email = user_email` with no
--     emptiness check — with guest profiles now carrying email '', a call with
--     an empty string would have promoted every guest at once. Now rejected,
--     and anonymous callers are rejected explicitly.
-- (4) send_welcome_email_trigger() fired on every auth.users INSERT, including
--     anonymous ones (posting a NULL email to the edge function). It now skips
--     rows with no email, and instead fires when an anonymous user attaches
--     their email for the first time — the real "welcome" moment.
-- (5) is_admin() now returns false for any anonymous JWT regardless of the
--     profiles row, so a compromised/edge-case guest identity can never reach
--     the admin policies or the admin dashboard's data.
--
-- Re-runnable: CREATE OR REPLACE + DROP TRIGGER IF EXISTS throughout.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Helper: is the CURRENT caller on an anonymous (guest) JWT?
-- ----------------------------------------------------------------------------
-- Supabase puts `is_anonymous` in the access token claims. Reading it through
-- auth.jwt() is NULL-safe for the anon role and for direct SQL (no JWT), where
-- it yields false.
CREATE OR REPLACE FUNCTION public.is_anonymous_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

COMMENT ON FUNCTION public.is_anonymous_session() IS
  'True when the caller holds a Supabase anonymous (guest) JWT. False for permanent accounts, for the no-JWT anon role and for direct SQL.';

REVOKE EXECUTE ON FUNCTION public.is_anonymous_session() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_anonymous_session() TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 1. GAP (1): profile creation must survive an anonymous signup
-- ----------------------------------------------------------------------------
-- profiles.email is NOT NULL; auth.users.email is NULL for anonymous users.
-- We keep the NOT NULL constraint (nothing else has to learn about NULLs) and
-- store '' for guests until they save their account.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user'::public.app_role)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let profile creation break sign-up (including anonymous sign-in).
  RAISE LOG 'handle_new_user: could not create profile for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates the public.profiles row for a new auth user. Anonymous sign-ups have no email, so '''' is stored until the account is saved (see sync_profile_email_trigger).';


-- ----------------------------------------------------------------------------
-- 2. GAP (2): keep profiles.email in sync when a guest saves their account
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE user_id = NEW.id;

    -- The row may not exist if handle_new_user failed earlier; heal it.
    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, email, role)
      VALUES (NEW.id, NEW.email, 'user'::public.app_role)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'sync_profile_email_trigger: could not sync email for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_trigger();


-- ----------------------------------------------------------------------------
-- 3. GAP (4): welcome email only when there IS an email
-- ----------------------------------------------------------------------------
-- Same body as 20260824120000_launch_security_hardening.sql, with an early
-- return for e-mail-less (anonymous) rows. Delivery still never fails signup.
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  internal_secret text;
BEGIN
  -- Anonymous sign-ups have no address; the welcome mail is sent later, when
  -- they save their account (on_auth_user_email_set below).
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

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

-- Fire the welcome mail at the moment a guest becomes a real account, i.e. the
-- first time auth.users.email goes from NULL to a value.
DROP TRIGGER IF EXISTS on_auth_user_email_set ON auth.users;
CREATE TRIGGER on_auth_user_email_set
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS NULL AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION public.send_welcome_email_trigger();


-- ----------------------------------------------------------------------------
-- 4. GAP (5): no anonymous JWT can ever be an admin
-- ----------------------------------------------------------------------------
-- is_admin() backs the admin RLS policies on profiles, game_rooms,
-- room_participants, game_responses, ai_analyses, credits, sessions, questions
-- and levels, plus promote_to_admin(). Short-circuiting it for guest JWTs
-- closes the whole surface in one place.
--
-- NOTE: the check is on the CALLER's JWT, not on user_id_param. A permanent
-- admin querying with a permanent session is unaffected; server-side/definer
-- contexts have no JWT and so are unaffected too.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_anonymous_session() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = $1 AND role = 'admin'::public.app_role
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'True when the given user is an admin AND the caller is not on an anonymous (guest) JWT. Guest sessions are never admins.';


-- ----------------------------------------------------------------------------
-- 5. GAP (3): promote_to_admin must reject empty emails and guest callers
-- ----------------------------------------------------------------------------
-- Guest profiles carry email = '' (section 1). Without the emptiness guard a
-- single promote_to_admin('') would have promoted every guest.
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_anonymous_session() THEN
    RAISE EXCEPTION 'permission denied: guest sessions cannot promote users';
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: only admins can promote users';
  END IF;

  IF user_email IS NULL OR btrim(user_email) = '' THEN
    RAISE EXCEPTION 'invalid email: refusing to match placeholder/guest profiles';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'::public.app_role
  WHERE email = btrim(user_email);

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.promote_to_admin(text) IS
  'Promotes a user (by email) to admin. Caller must be a non-guest admin and the email must be non-empty (guest profiles carry ''''). Bootstrap the first admin via a direct UPDATE on public.profiles using the service role.';


-- ----------------------------------------------------------------------------
-- 6. Backfill: profiles rows for any user that has none
-- ----------------------------------------------------------------------------
-- Cheap and idempotent; guards against guests created between the dashboard
-- toggle being switched on and this migration being applied.
INSERT INTO public.profiles (user_id, email, role)
SELECT u.id, COALESCE(u.email, ''), 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================================
-- DELIBERATELY NOT CHANGED
-- ============================================================================
--  * The `anon`-role policies and room_is_recently_active(): the no-account
--    partner flow is unchanged by this migration.
--  * consume_credit_for_room(): guests may call it and are correctly refused
--    for lack of credits/premium. Adding an explicit is_anonymous_session()
--    block would also break the (future) case of a guest who was gifted
--    credits, and buys nothing today.
--  * Rate limiting of anonymous sign-ups: enforced in the Supabase dashboard,
--    not in SQL. See supabase/DEPLOYMENT.md.
-- ============================================================================

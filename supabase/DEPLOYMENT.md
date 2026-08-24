# Security Hardening — Deployment Guide

This guide covers everything the project owner must do to roll out the
launch security hardening (migration `20260824120000_launch_security_hardening.sql`
plus the updated/new edge functions). Nothing here has been applied to the
live project — it is code only until you deploy it.

## What changed (summary)

| Area | Before | After |
|---|---|---|
| `game_rooms` / `room_participants` RLS | `SELECT USING (true)`, anonymous could insert/update any row | Scoped: authenticated users see rooms they host/play; anonymous (no-JWT) partners only reach rooms that are live or finished < 24h. Joins go exclusively through the `join_room_by_code` / `create_room_and_join` RPCs |
| `game_responses`, `game_sync`, `level_selection_votes`, `connection_states`, `game_flow_queue` | Gated on forgeable participant checks or authenticated-only | Participant-scoped for authenticated users, active-room-window for anonymous partners; answers immutable after insert (only `evaluation`, `evaluation_by` updatable) |
| `ai_analyses` | Any authenticated user could read every couple's analysis; anyone could insert | Readable only by that room's host/participants (+ recent-window for the anonymous partner); writable only by the service role |
| `profiles.role` escalation | `UPDATE` policy without `WITH CHECK`; `promote_to_admin()` had no caller check | Column-level privileges: clients can only update `last_seen`/`last_login`/`updated_at`; `promote_to_admin()` now requires the caller to already be an admin |
| `add_credits()` | Executable by any logged-in user via RPC (free credits) | Executable by `service_role` only |
| Payments | `verify-payment` granted credits from a client-passed `session_id`, trusting metadata, unauthenticated, replayable | New `stripe-webhook` function (signature-verified) is the source of truth; `verify-payment` requires the caller to be the user in `session.metadata.user_id` and both paths share an idempotency ledger (`public.stripe_events`) so a session can never be credited twice |
| Public edge functions | 5 functions with `verify_jwt = false`, CORS `*` | `intelligent-question-selector`, `getclose-ai-analysis`, `send-ai-analysis-email` now require a project JWT **and** validate room access in-function; `send-welcome-email`, `send-reengagement-email`, `process-game-queue` require the `INTERNAL_FUNCTION_SECRET` header; CORS restricted to `ALLOWED_ORIGINS` |

## 0. Create the Close Premium products in Stripe

The "Close Premium" couple subscription needs two recurring Prices in the
Stripe dashboard (Products → Add product):

- Product **Close Premium** with two prices:
  - **€6.99 / month** (recurring, monthly) → copy its price id into
    `STRIPE_PRICE_PREMIUM_MONTHLY`
  - **€39.99 / year** (recurring, yearly) → copy its price id into
    `STRIPE_PRICE_PREMIUM_YEARLY`

The frontend displays €6.99/€39.99; keep the Stripe prices in sync with
`PRICES` in `src/pages/Premium.tsx` if you ever change them.

## 1. Set the secrets

### 1a. Edge function secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \        # from step 3 below
  STRIPE_PRICE_PREMIUM_MONTHLY="price_..." \ # from step 0 below (Close Premium €6.99/mo)
  STRIPE_PRICE_PREMIUM_YEARLY="price_..." \  # from step 0 below (Close Premium €39.99/yr)
  INTERNAL_FUNCTION_SECRET="$(openssl rand -hex 32)" \
  ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com" \
  OPENAI_API_KEY="sk-..." \
  RESEND_API_KEY="re_..."
```

Notes:

- `ALLOWED_ORIGINS` is a comma-separated list. Local dev origins
  (`http://localhost:5173`, `:8080`, `:3000`) are used as fallback defaults
  when the variable is unset; in production set the real domain(s). The first
  entry is also used as the Stripe checkout redirect target when the request
  `Origin` is not in the list.
- Keep the value you generated for `INTERNAL_FUNCTION_SECRET` — you need the
  same value in step 1b.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
  provided to functions automatically; you do not set them.

### 1b. Database vault secret (same value as INTERNAL_FUNCTION_SECRET)

The welcome-email trigger and the cron jobs read the internal secret from
Supabase Vault. In the SQL editor run (replace with the exact same value used
in step 1a):

```sql
select vault.create_secret('<the-same-value>', 'internal_function_secret');
```

If it already exists, update it instead:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'internal_function_secret'),
  new_secret := '<the-same-value>'
);
```

Until this secret exists, welcome emails are skipped (signup itself is never
blocked), and the re-engagement/queue cron calls will be rejected by the
functions — that is fail-closed by design.

## 2. Apply the migration

```bash
supabase db push
# or explicitly:
supabase migration up
```

Two new migrations apply, **in order**:

1. `20260824120000_launch_security_hardening.sql` (security hardening)
2. `20260824140000_premium_subscriptions.sql` (Close Premium) — depends on
   the hardening migration (service-role write discipline, `stripe_events`
   ledger). It creates `public.subscriptions` (RLS: couple can SELECT, only
   service_role writes), `public.has_premium(uuid)` and
   `public.set_subscription_partner(text)` (both granted to `authenticated`).

The hardening migration (`supabase/migrations/20260824120000_launch_security_hardening.sql`):

- drops **all** existing policies on the game/profile/credit tables and
  recreates the scoped set (idempotent to re-run);
- creates `public.stripe_events` (payment idempotency ledger);
- locks down `add_credits()` / `promote_to_admin()` and restricts updatable
  columns on `game_rooms`, `game_responses`, `profiles`;
- rewrites `send_welcome_email_trigger()` and the pg_cron jobs
  (`send-reengagement-emails`, `process-game-flow-queue`) to authenticate with
  the internal secret, and removes two redundant duplicate queue-processor
  cron jobs.

## 3. Create the Stripe webhook endpoint

In the Stripe dashboard (Developers → Webhooks → Add endpoint):

- **Endpoint URL:** `https://bbdeyohqrutithaziulp.supabase.co/functions/v1/stripe-webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded` (optional but recommended if
    you ever enable delayed payment methods)
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

  The three `customer.subscription.*` events keep `public.subscriptions`
  (Close Premium) in sync — renewals, payment failures (`past_due`) and
  cancellations all flow through them.
- Copy the endpoint's **signing secret** (`whsec_...`) and set it as
  `STRIPE_WEBHOOK_SECRET` (step 1a), then redeploy the function if it was
  already deployed.

## 4. Deploy the functions

```bash
supabase functions deploy stripe-webhook
supabase functions deploy verify-payment
supabase functions deploy create-payment
supabase functions deploy intelligent-question-selector
supabase functions deploy getclose-ai-analysis
supabase functions deploy send-ai-analysis-email
supabase functions deploy send-welcome-email
supabase functions deploy send-reengagement-email
supabase functions deploy process-game-queue
```

`supabase/config.toml` carries the per-function `verify_jwt` settings; the
CLI applies them on deploy.

## 5. Bootstrap the first admin

`promote_to_admin()` now requires the caller to already be an admin, so seed
the first one directly in the SQL editor (runs as `postgres`, bypasses RLS):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

After that, admins can promote others via `select promote_to_admin('other@example.com');`.

## 6. Test checklist

Game flows (must all still work):

1. **Host creates a room** while signed in → room code displayed, host shows
   as player 1.
2. **Anonymous join by code**: open an incognito window (no login), enter the
   6-char code → joins as player 2, both lobbies update in realtime.
3. **Play a round**: proximity answer, level selection (both players),
   card display, answer + partner evaluation. Verify the AI question selector
   works (or falls back to random) for both the host and the anonymous player.
4. **Finish the game** and generate the AI analysis; both players can see it;
   "email me the report" delivers to the host.
5. **Negative checks** (with a fresh anon key client, e.g. curl):
   - `GET /rest/v1/game_rooms?select=*` with the anon key returns only
     currently live/recent rooms, never the historical archive.
   - `POST /rest/v1/room_participants` (direct insert) is rejected.
   - As user A, `PATCH /rest/v1/profiles?user_id=eq.<A>` with `{"role":"admin"}`
     is rejected (column not updatable).
   - `select add_credits('<your-uuid>', 100);` via RPC as a logged-in user is
     rejected (permission denied).

Payments:

6. Buy the cheapest package with a Stripe test card → after redirect, the
   success page shows credits added; check `public.stripe_events` has exactly
   one row for the session; balance increased exactly once. Press refresh on
   the success page repeatedly → no additional credits.
7. In the Stripe dashboard, resend the webhook event → function responds
   `duplicate: true`, no extra credits.
8. Call `verify-payment` with a session id belonging to another user (or
   without a login token) → 403/401.

Close Premium:

- Subscribe on `/premium` with a Stripe test card → redirected to
  `/payment-success?mode=subscription`, welcome screen shown; a row appears
  in `public.subscriptions` with `status = 'active'` and the right plan;
  `select public.has_premium('<your-uuid>');` returns true.
- Link a partner by email on `/premium` → `partner_user_id` set; the partner
  account also gets `has_premium = true`.
- Cancel the subscription in the Stripe dashboard → the
  `customer.subscription.deleted` webhook flips the row to `canceled`.

Internal functions:

9. `curl -X POST .../functions/v1/send-reengagement-email` without headers →
   403. With `x-internal-secret: <secret>` → runs.
10. Create a new test account → welcome email arrives (requires the vault
    secret from step 1b).
11. Check the `process-game-flow-queue` cron job is running
    (`select * from cron.job;` and function logs).

## Known limitations / residual risk (documented decisions)

- **Anonymous players have no verifiable identity.** The partner joins with
  no account and no JWT, so RLS cannot pin an anonymous request to a person.
  Anonymous access is therefore scoped by (a) the unguessable room UUID that
  is only learned via the 6-char code, and (b) the "recently active" window —
  the anon role can only ever see rooms that are live now or finished within
  the last 24 hours. Someone holding the anon API key can enumerate *live*
  rooms, but never the historical archive. Eliminating this entirely requires
  switching the join flow to Supabase **anonymous sign-in**
  (`auth.signInAnonymously()`) — a frontend change that was out of scope here
  but is the recommended follow-up; the policies are already written so that
  authenticated identities (which anonymous sign-in provides) get the strict
  per-user checks.
- **Anonymous partners lose access to a finished game's analysis after 24h.**
  Intentional: the analysis screen is used right after the game. Signed-in
  users keep permanent access to their own rooms.
- **`verify_jwt = true` relies on the legacy JWT-style anon key** (the one in
  `src/integrations/supabase/client.ts`). If you migrate the frontend to the
  new `sb_publishable_...` API keys, anonymous players' calls to the three
  JWT-verified functions would be rejected at the platform layer — flip those
  entries to `verify_jwt = false` in `config.toml` at that point (their
  in-function room guards remain in force).
- **`verify-payment` can grant as a fallback** when the webhook has not
  arrived yet (e.g. webhook misconfigured). It shares the same
  `stripe_events` idempotency ledger as the webhook, so double-granting is
  impossible; the webhook remains the source of truth.

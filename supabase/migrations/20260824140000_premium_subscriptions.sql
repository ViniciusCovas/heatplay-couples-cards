-- =============================================================================
-- Close Premium — couple subscription (monthly / yearly)
--
-- Adds:
--   * public.subscriptions        — one row per Stripe subscription, written
--                                   exclusively by the service role (webhook).
--   * public.has_premium(uuid)    — SECURITY DEFINER check used by clients and
--                                   server code: true when the user owns or is
--                                   the linked partner of an active, unexpired
--                                   subscription.
--   * public.set_subscription_partner(text)
--                                 — owner-callable RPC that links a partner by
--                                   email so both halves of the couple are
--                                   covered by one subscription.
--
-- Depends on 20260824120000_launch_security_hardening.sql (service-role-only
-- write discipline, stripe_events ledger used by the webhook for idempotency).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  plan                   text check (plan in ('monthly', 'yearly')),
  status                 text not null default 'incomplete'
                         check (status in ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_end     timestamptz,
  partner_user_id        uuid references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx    on public.subscriptions (user_id);
create index if not exists subscriptions_partner_id_idx on public.subscriptions (partner_user_id);

-- keep updated_at fresh on every write
create or replace function public.subscriptions_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.subscriptions_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: members of the couple can read their row; only service_role writes.
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid() or partner_user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated/anon: with RLS enabled
-- and no policy, all client writes are denied. The service role bypasses RLS.

grant select on public.subscriptions to authenticated;
revoke insert, update, delete on public.subscriptions from authenticated, anon;
revoke all on public.subscriptions from anon;

-- ---------------------------------------------------------------------------
-- has_premium(p_user_id): does this user (owner or linked partner) hold an
-- active, unexpired subscription?
-- ---------------------------------------------------------------------------
create or replace function public.has_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where (s.user_id = p_user_id or s.partner_user_id = p_user_id)
      and s.status = 'active'
      and s.current_period_end is not null
      and s.current_period_end > now()
  );
$$;

revoke all on function public.has_premium(uuid) from public;
grant execute on function public.has_premium(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- set_subscription_partner(partner_email): the subscription OWNER links their
-- partner by email. SECURITY DEFINER so it may look up auth.users, but every
-- path is pinned to auth.uid() — a caller can only modify their own
-- subscription and can never link themselves to someone else's.
-- ---------------------------------------------------------------------------
create or replace function public.set_subscription_partner(partner_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller  uuid := auth.uid();
  v_partner uuid;
  v_sub_id  uuid;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- caller must own an active, unexpired subscription
  select s.id into v_sub_id
  from public.subscriptions s
  where s.user_id = v_caller
    and s.status = 'active'
    and s.current_period_end is not null
    and s.current_period_end > now()
  order by s.current_period_end desc
  limit 1;

  if v_sub_id is null then
    return jsonb_build_object('success', false, 'error', 'no_active_subscription');
  end if;

  select u.id into v_partner
  from auth.users u
  where lower(u.email) = lower(trim(partner_email))
  limit 1;

  if v_partner is null then
    return jsonb_build_object('success', false, 'error', 'partner_not_found');
  end if;

  if v_partner = v_caller then
    return jsonb_build_object('success', false, 'error', 'cannot_link_self');
  end if;

  update public.subscriptions
  set partner_user_id = v_partner
  where id = v_sub_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.set_subscription_partner(text) from public;
grant execute on function public.set_subscription_partner(text) to authenticated;

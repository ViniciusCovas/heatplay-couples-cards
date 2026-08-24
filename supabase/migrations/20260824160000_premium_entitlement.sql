-- =============================================================================
-- Premium entitlement — Close Premium subscribers play without spending credits
--
-- Before this migration, public.consume_credit_for_room() was the ONLY path that
-- activates a room (creates the sessions row and flips game_rooms to
-- playing / active_session). It hard-required a credit balance >= 1, so a paying
-- Close Premium subscriber could not start a night at all.
--
-- This migration:
--   * adds sessions.funding ('credit' | 'premium') so revenue reporting can tell
--     credit-funded nights from subscription-funded ones;
--   * replaces consume_credit_for_room so that when public.has_premium(auth.uid())
--     is true the room is activated WITHOUT decrementing public.credits.
--
-- All existing guards are preserved: the credits row lock, room ownership
-- (host_user_id = auth.uid()), and the pending_credit / active_session state
-- checks. Re-runnable (CREATE OR REPLACE / IF NOT EXISTS).
--
-- Depends on 20260824140000_premium_subscriptions.sql for public.has_premium(uuid).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sessions.funding — how this night was paid for.
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists funding text not null default 'credit';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_funding_check'
  ) then
    alter table public.sessions
      add constraint sessions_funding_check check (funding in ('credit', 'premium'));
  end if;
end
$$;

comment on column public.sessions.funding is
  'credit = a credit was decremented; premium = covered by an active Close Premium subscription (no credit spent).';

-- ---------------------------------------------------------------------------
-- consume_credit_for_room — credit OR premium activation.
-- ---------------------------------------------------------------------------
create or replace function public.consume_credit_for_room(room_code_param text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
DECLARE
  v_user           uuid := auth.uid();
  v_is_premium     boolean;
  current_balance  integer;
  session_record   record;
  target_room_id   uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_is_premium := public.has_premium(v_user);

  -- Lock the caller's credits row for the whole transaction (unchanged guard).
  -- Premium users may not have a credits row at all; that is fine.
  SELECT balance INTO current_balance
  FROM public.credits
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT v_is_premium AND COALESCE(current_balance, 0) < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', COALESCE(current_balance, 0)
    );
  END IF;

  SELECT id INTO target_room_id
  FROM public.game_rooms
  WHERE room_code = room_code_param
    AND host_user_id = v_user
    AND credit_status = 'pending_credit';

  IF target_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found_or_not_owned');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = target_room_id AND credit_status = 'active_session'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_already_active');
  END IF;

  INSERT INTO public.sessions (user_id, room_id, credits_consumed, session_status, funding)
  VALUES (
    v_user,
    target_room_id,
    CASE WHEN v_is_premium THEN 0 ELSE 1 END,
    'active',
    CASE WHEN v_is_premium THEN 'premium' ELSE 'credit' END
  )
  RETURNING * INTO session_record;

  IF NOT v_is_premium THEN
    UPDATE public.credits
    SET balance = balance - 1,
        total_consumed = total_consumed + 1,
        updated_at = now()
    WHERE user_id = v_user;
  END IF;

  UPDATE public.game_rooms
  SET status = 'playing',
      credit_status = 'active_session',
      session_id = session_record.id,
      started_at = now(),
      current_phase = 'proximity-selection'
  WHERE id = target_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', session_record.id,
    'new_balance', CASE WHEN v_is_premium
                        THEN COALESCE(current_balance, 0)
                        ELSE COALESCE(current_balance, 0) - 1 END,
    'premium', v_is_premium,
    'funding', CASE WHEN v_is_premium THEN 'premium' ELSE 'credit' END,
    'room_id', target_room_id
  );
END;
$$;

revoke all on function public.consume_credit_for_room(text) from public;
grant execute on function public.consume_credit_for_room(text) to authenticated;

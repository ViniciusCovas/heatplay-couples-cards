
-- 1) Helper: participant check with SECURITY DEFINER
create or replace function public.is_user_participant(room_id_param uuid, user_id_param uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return exists (
    select 1
    from public.room_participants
    where room_id = room_id_param
      and player_id = user_id_param::text
  );
end;
$$;

-- 2) game_rooms policies: replace subqueries with helper to avoid recursion issues

-- Drop existing combined policies
drop policy if exists "Users can view rooms they participate in" on public.game_rooms;
drop policy if exists "Room hosts and participants can update rooms" on public.game_rooms;

-- Keep/ensure INSERT policy exists (do not drop if already correct)
-- CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
-- FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create separate view policies
create policy "Hosts can view rooms"
on public.game_rooms
for select
using (host_user_id = auth.uid());

create policy "Participants can view rooms"
on public.game_rooms
for select
using (public.is_user_participant(id, auth.uid()));

-- Create separate update policies
create policy "Hosts can update rooms"
on public.game_rooms
for update
using (host_user_id = auth.uid());

create policy "Participants can update rooms"
on public.game_rooms
for update
using (public.is_user_participant(id, auth.uid()));

-- 3) room_participants SELECT policy: allow seeing all participants in your room without self-referencing text

drop policy if exists "Users can view participants in their rooms" on public.room_participants;

create policy "Users can view participants in their rooms"
on public.room_participants
for select
using (public.is_user_participant(room_id, auth.uid()));

-- Keep existing INSERT/UPDATE/DELETE policies as-is (they restrict mutation to self):
-- INSERT: WITH CHECK (player_id = (auth.uid())::text)
-- UPDATE: USING (player_id = (auth.uid())::text)
-- DELETE: USING (player_id = (auth.uid())::text)

-- 4) Atomic RPC to create a room and join as player 1 safely

create or replace function public.create_room_and_join(
  level_param integer,
  selected_language_param character varying default 'en'
)
returns table (id uuid, room_code text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_code text;
begin
  -- generate a simple 6-char code
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.game_rooms (
    room_code,
    level,
    status,
    created_by,
    credit_status,
    host_user_id,
    selected_language
  ) values (
    v_code,
    coalesce(level_param, 1),
    'waiting',
    auth.uid()::text,
    'pending_credit',
    auth.uid(),
    coalesce(selected_language_param, 'en')
  )
  returning id into v_id;

  -- add creator as participant 1
  insert into public.room_participants (room_id, player_id, is_ready, player_number)
  values (v_id, auth.uid()::text, true, 1);

  return query select v_id, v_code;
end;
$$;

-- Safe migration: Add new TEXT columns, copy data, then swap

-- room_participants
ALTER TABLE public.room_participants ADD COLUMN player_id_new TEXT;
UPDATE public.room_participants SET player_id_new = player_id::TEXT;
ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_player_id_fkey;
ALTER TABLE public.room_participants DROP COLUMN player_id;
ALTER TABLE public.room_participants RENAME COLUMN player_id_new TO player_id;
ALTER TABLE public.room_participants ALTER COLUMN player_id SET NOT NULL;

-- game_responses player_id
ALTER TABLE public.game_responses ADD COLUMN player_id_new TEXT;
UPDATE public.game_responses SET player_id_new = player_id::TEXT;
ALTER TABLE public.game_responses DROP CONSTRAINT IF EXISTS game_responses_player_id_fkey;
ALTER TABLE public.game_responses DROP COLUMN player_id;
ALTER TABLE public.game_responses RENAME COLUMN player_id_new TO player_id;
ALTER TABLE public.game_responses ALTER COLUMN player_id SET NOT NULL;

-- game_responses evaluation_by
ALTER TABLE public.game_responses ADD COLUMN evaluation_by_new TEXT;
UPDATE public.game_responses SET evaluation_by_new = evaluation_by::TEXT;
ALTER TABLE public.game_responses DROP CONSTRAINT IF EXISTS game_responses_evaluation_by_fkey;
ALTER TABLE public.game_responses DROP COLUMN evaluation_by;
ALTER TABLE public.game_responses RENAME COLUMN evaluation_by_new TO evaluation_by;

-- game_sync triggered_by
ALTER TABLE public.game_sync ADD COLUMN triggered_by_new TEXT;
UPDATE public.game_sync SET triggered_by_new = triggered_by::TEXT;
ALTER TABLE public.game_sync DROP CONSTRAINT IF EXISTS game_sync_triggered_by_fkey;
ALTER TABLE public.game_sync DROP COLUMN triggered_by;
ALTER TABLE public.game_sync RENAME COLUMN triggered_by_new TO triggered_by;
ALTER TABLE public.game_sync ALTER COLUMN triggered_by SET NOT NULL;

-- connection_states player_id
ALTER TABLE public.connection_states ADD COLUMN player_id_new TEXT;
UPDATE public.connection_states SET player_id_new = player_id::TEXT;
ALTER TABLE public.connection_states DROP CONSTRAINT IF EXISTS connection_states_player_id_fkey;
ALTER TABLE public.connection_states DROP COLUMN player_id;
ALTER TABLE public.connection_states RENAME COLUMN player_id_new TO player_id;
ALTER TABLE public.connection_states ALTER COLUMN player_id SET NOT NULL;
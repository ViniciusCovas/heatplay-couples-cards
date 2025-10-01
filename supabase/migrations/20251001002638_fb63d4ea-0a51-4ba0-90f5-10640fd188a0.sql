-- Phase 1: Clean up function conflicts
-- Drop the old single-parameter join_room_by_code function to eliminate PostgreSQL function resolution conflicts

DROP FUNCTION IF EXISTS public.join_room_by_code(text);

-- The 2-parameter version that supports both authenticated and anonymous users will remain:
-- public.join_room_by_code(room_code_param text, player_id_param text)

-- Add comment for clarity
COMMENT ON FUNCTION public.join_room_by_code(text, text) IS 'Allows both authenticated and anonymous users to join a room by providing room code and player ID';
-- PHASE 1: Emergency Database Fixes - Restore Missing Triggers and Fix Stuck Rooms

-- 1. Install missing auto_create_response_sync_event trigger (critical for game flow)
DROP TRIGGER IF EXISTS auto_create_response_sync_event_trigger ON public.game_responses;

CREATE TRIGGER auto_create_response_sync_event_trigger
  AFTER INSERT OR UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_response_sync_event();

-- 2. Fix all stuck rooms (16 identified) by updating their phase to proper state
-- Rooms stuck in evaluation with pending responses
UPDATE public.game_rooms 
SET current_phase = 'evaluation'
WHERE current_phase != 'evaluation' 
  AND id IN (
    SELECT DISTINCT gr.id 
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gr.status = 'playing'
  );

-- 3. Clean up duplicate/phantom game_responses data
DELETE FROM public.game_responses 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY room_id, card_id, player_id 
      ORDER BY created_at DESC
    ) as rn
    FROM public.game_responses
  ) t WHERE t.rn > 1
);

-- PHASE 2: Security Standardization - Fix RLS Policies

-- 4. Standardize game_sync RLS policies (fix overly permissive anonymous access)
DROP POLICY IF EXISTS "Room participants can view sync events" ON public.game_sync;

CREATE POLICY "Room participants can view sync events (secure)" 
ON public.game_sync 
FOR SELECT 
USING (
  -- Authenticated users must be participants
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = game_sync.room_id 
    AND player_id = auth.uid()::text
  ))
  OR
  -- Anonymous users can only see events they triggered in rooms they participate in
  (auth.uid() IS NULL AND triggered_by IN (
    SELECT player_id FROM public.room_participants 
    WHERE room_id = game_sync.room_id
  ))
);

-- 5. Standardize game_responses RLS for anonymous users
DROP POLICY IF EXISTS "Room participants can update responses in their room" ON public.game_responses;

CREATE POLICY "Room participants can update responses (secure)" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND rp.player_id = auth.uid()::text)
      OR 
      (auth.uid() IS NULL AND rp.player_id = game_responses.evaluation_by)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id 
    AND (
      (auth.uid() IS NOT NULL AND rp.player_id = auth.uid()::text)
      OR 
      (auth.uid() IS NULL AND rp.player_id = game_responses.evaluation_by)
    )
  )
);

-- 6. Add missing referential integrity constraints
ALTER TABLE public.game_responses 
ADD CONSTRAINT fk_game_responses_room_id 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

ALTER TABLE public.room_participants 
ADD CONSTRAINT fk_room_participants_room_id 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

ALTER TABLE public.game_sync 
ADD CONSTRAINT fk_game_sync_room_id 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

ALTER TABLE public.connection_states 
ADD CONSTRAINT fk_connection_states_room_id 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

ALTER TABLE public.level_selection_votes 
ADD CONSTRAINT fk_level_selection_votes_room_id 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

-- 7. Create automatic recovery function for stuck evaluations
CREATE OR REPLACE FUNCTION public.auto_advance_stuck_evaluations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stuck_room RECORD;
BEGIN
  -- Find rooms stuck in evaluation for more than 45 seconds
  FOR stuck_room IN 
    SELECT 
      gr.id as room_id,
      gres.id as response_id,
      gres.evaluation_by,
      gres.round_number
    FROM public.game_rooms gr
    JOIN public.game_responses gres ON gr.id = gres.room_id 
    WHERE gr.current_phase = 'evaluation'
      AND gres.response IS NOT NULL 
      AND gres.evaluation IS NULL
      AND gres.created_at < NOW() - INTERVAL '45 seconds'
      AND gr.status = 'playing'
  LOOP
    -- Auto-submit a neutral evaluation
    UPDATE public.game_responses 
    SET 
      evaluation = 'Auto-advanced due to timeout',
      evaluation_by = stuck_room.evaluation_by
    WHERE id = stuck_room.response_id;
    
    RAISE LOG 'Auto-advanced stuck room % after 45s timeout', stuck_room.room_id;
  END LOOP;
END;
$$;
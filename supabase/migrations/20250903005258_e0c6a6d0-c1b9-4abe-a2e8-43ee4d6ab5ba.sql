-- Fix RLS policies for anonymous users to properly update game_responses

-- Drop and recreate the UPDATE policy for game_responses to ensure anonymous users can submit evaluations
DROP POLICY IF EXISTS "Room participants can update responses in their room" ON public.game_responses;

CREATE POLICY "Room participants can update responses in their room" 
ON public.game_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id 
    AND (
      -- For authenticated users: match by user ID
      (auth.uid() IS NOT NULL AND rp.player_id = (auth.uid())::text) OR
      -- For anonymous users: allow any participant to update evaluations
      (auth.uid() IS NULL AND rp.player_id IS NOT NULL)
    )
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = game_responses.room_id 
    AND (
      -- For authenticated users: match by user ID
      (auth.uid() IS NOT NULL AND rp.player_id = (auth.uid())::text) OR
      -- For anonymous users: allow any participant to update evaluations
      (auth.uid() IS NULL AND rp.player_id IS NOT NULL)
    )
  )
);

-- Create a function to help debug evaluation submissions
CREATE OR REPLACE FUNCTION public.debug_evaluation_submission(
  response_id_param uuid,
  player_id_param text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_record record;
  participant_record record;
  room_record record;
BEGIN
  -- Get the response record
  SELECT * INTO response_record
  FROM public.game_responses
  WHERE id = response_id_param;
  
  IF response_record IS NULL THEN
    RETURN jsonb_build_object('error', 'response_not_found');
  END IF;
  
  -- Get participant info
  SELECT * INTO participant_record
  FROM public.room_participants
  WHERE room_id = response_record.room_id
  AND player_id = player_id_param;
  
  IF participant_record IS NULL THEN
    RETURN jsonb_build_object('error', 'participant_not_found');
  END IF;
  
  -- Get room info
  SELECT * INTO room_record
  FROM public.game_rooms
  WHERE id = response_record.room_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'response_exists', true,
    'participant_exists', true,
    'room_phase', room_record.current_phase,
    'room_status', room_record.status,
    'auth_uid', auth.uid(),
    'player_id', player_id_param,
    'response_player_id', response_record.player_id,
    'evaluation_by', response_record.evaluation_by,
    'can_update', (
      auth.uid() IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.room_participants rp2
        WHERE rp2.room_id = response_record.room_id 
        AND rp2.player_id = (auth.uid())::text
      )
    )
  );
END;
$$;
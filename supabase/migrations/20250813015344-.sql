-- Update the is_user_participant function to handle both authenticated and anonymous users
CREATE OR REPLACE FUNCTION public.is_user_participant(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle both authenticated users (by UUID) and anonymous users (by checking player_id)
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND (
      player_id = user_id_param::text OR 
      (user_id_param IS NOT NULL AND player_id = user_id_param::text)
    )
  );
END;
$function$;
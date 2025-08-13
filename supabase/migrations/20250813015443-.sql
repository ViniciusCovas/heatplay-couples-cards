-- Create a new function specifically for checking if a player_id participates in a room
CREATE OR REPLACE FUNCTION public.player_participates_in_room(room_id_param uuid, player_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  );
END;
$function$;
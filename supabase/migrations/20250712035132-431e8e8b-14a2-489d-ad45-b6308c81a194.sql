-- Update any remaining stuck rooms with matching votes
UPDATE public.game_rooms 
SET current_phase = 'card-display',
    level = (
      SELECT selected_level 
      FROM public.level_selection_votes 
      WHERE room_id = game_rooms.id 
      GROUP BY room_id, selected_level 
      HAVING COUNT(DISTINCT player_id) = 2
      LIMIT 1
    )
WHERE current_phase = 'level-select' 
AND status = 'active'
AND id IN (
  SELECT room_id 
  FROM public.level_selection_votes 
  GROUP BY room_id, selected_level 
  HAVING COUNT(DISTINCT player_id) = 2
);
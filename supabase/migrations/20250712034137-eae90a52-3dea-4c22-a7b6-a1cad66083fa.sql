-- Add missing DELETE policy for level_selection_votes
CREATE POLICY "Anyone can delete level selection votes" 
ON public.level_selection_votes 
FOR DELETE 
USING (true);

-- Clean up stuck rooms by updating their phase if they have matching votes
UPDATE public.game_rooms 
SET current_phase = 'card-display',
    level = (
      SELECT selected_level 
      FROM public.level_selection_votes 
      WHERE room_id = game_rooms.id 
      LIMIT 1
    )
WHERE current_phase = 'level-select' 
AND id IN (
  SELECT room_id 
  FROM public.level_selection_votes 
  GROUP BY room_id, selected_level 
  HAVING COUNT(DISTINCT player_id) = 2
);
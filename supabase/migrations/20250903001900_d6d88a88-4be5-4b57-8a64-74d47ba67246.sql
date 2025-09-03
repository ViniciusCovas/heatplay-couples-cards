-- Fix remaining stuck games by resetting them to card-display phase with new cards
-- Reset room 27772B
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = 1
      AND q.language = 'en'
      AND q.is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = '27772B';

-- Reset room 4B90EF
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = 1
      AND q.language = 'en'
      AND q.is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = '4B90EF';

-- Reset room B5F786
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = 1
      AND q.language = 'en'
      AND q.is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = 'B5F786';

-- Reset room E381E6
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = 1
      AND q.language = 'en'
      AND q.is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = 'E381E6';
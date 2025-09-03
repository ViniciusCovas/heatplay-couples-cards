-- Create the missing trigger for evaluation completion
CREATE TRIGGER handle_evaluation_completion_trigger
  AFTER UPDATE ON public.game_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_evaluation_completion();

-- Fix stuck games by resetting them to card-display phase with new cards
-- Reset room 27772B
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = (SELECT level FROM public.game_rooms WHERE room_code = '27772B')
      AND q.language = (SELECT selected_language FROM public.game_rooms WHERE room_code = '27772B')
      AND q.is_active = true
      AND NOT (q.id::text = ANY(COALESCE((SELECT used_cards FROM public.game_rooms WHERE room_code = '27772B'), '{}')))
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = '27772B';

-- Reset room 4B90EF
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player2',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = (SELECT level FROM public.game_rooms WHERE room_code = '4B90EF')
      AND q.language = (SELECT selected_language FROM public.game_rooms WHERE room_code = '4B90EF')
      AND q.is_active = true
      AND NOT (q.id::text = ANY(COALESCE((SELECT used_cards FROM public.game_rooms WHERE room_code = '4B90EF'), '{}')))
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
    WHERE l.sort_order = (SELECT level FROM public.game_rooms WHERE room_code = 'B5F786')
      AND q.language = (SELECT selected_language FROM public.game_rooms WHERE room_code = 'B5F786')
      AND q.is_active = true
      AND NOT (q.id::text = ANY(COALESCE((SELECT used_cards FROM public.game_rooms WHERE room_code = 'B5F786'), '{}')))
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = 'B5F786';

-- Reset room E381E6
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player2',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = (SELECT level FROM public.game_rooms WHERE room_code = 'E381E6')
      AND q.language = (SELECT selected_language FROM public.game_rooms WHERE room_code = 'E381E6')
      AND q.is_active = true
      AND NOT (q.id::text = ANY(COALESCE((SELECT used_cards FROM public.game_rooms WHERE room_code = 'E381E6'), '{}')))
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = 'E381E6';

-- Reset room 07D571
UPDATE public.game_rooms 
SET 
  current_phase = 'card-display',
  current_turn = 'player1',
  current_card = (
    SELECT q.id::text 
    FROM public.questions q
    JOIN public.levels l ON q.level_id = l.id
    WHERE l.sort_order = (SELECT level FROM public.game_rooms WHERE room_code = '07D571')
      AND q.language = (SELECT selected_language FROM public.game_rooms WHERE room_code = '07D571')
      AND q.is_active = true
      AND NOT (q.id::text = ANY(COALESCE((SELECT used_cards FROM public.game_rooms WHERE room_code = '07D571'), '{}')))
    ORDER BY RANDOM()
    LIMIT 1
  ),
  current_card_index = current_card_index + 1
WHERE room_code = '07D571';
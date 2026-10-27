-- Guests now have verified anonymous-auth identities. Room codes invite a
-- player; they are not a substitute for row-level authorization after joining.
DO $$
DECLARE pol record; col record;
BEGIN
  FOR pol IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND 'anon' = ANY(roles)
      AND tablename IN ('game_rooms','room_participants','game_responses','game_sync',
        'level_selection_votes','connection_states','ai_analyses','game_flow_queue')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
  -- Table-level REVOKE does not clear older column-level grants.
  FOR col IN SELECT table_name, column_name FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND grantee = 'anon'
      AND table_name IN ('game_rooms','room_participants','game_responses','game_sync',
        'level_selection_votes','connection_states','ai_analyses','game_flow_queue')
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON public.%I FROM anon', col.column_name, col.table_name);
  END LOOP;
END $$;
REVOKE ALL ON public.game_rooms, public.room_participants, public.game_responses,
  public.game_sync, public.level_selection_votes, public.connection_states,
  public.ai_analyses, public.game_flow_queue FROM anon;

CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_param text, player_id_param text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE room public.game_rooms; existing public.room_participants; assigned integer;
BEGIN
  IF auth.uid() IS NULL OR player_id_param IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF room_code_param IS NULL OR upper(trim(room_code_param)) !~ '^[A-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_room_code');
  END IF;
  -- Serializes joiners across clients so the second seat cannot be claimed twice.
  SELECT * INTO room FROM public.game_rooms WHERE room_code = upper(trim(room_code_param)) FOR UPDATE;
  IF room.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'room_not_found'); END IF;
  SELECT * INTO existing FROM public.room_participants WHERE room_id = room.id AND player_id = auth.uid()::text;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'room_id', room.id, 'player_number', existing.player_number, 'already_joined', true);
  END IF;
  IF room.status <> 'waiting' AND NOT (room.status = 'playing' AND room.current_phase IN ('proximity-selection', 'level-selection')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_closed');
  END IF;
  SELECT n INTO assigned FROM generate_series(1,2) AS n
    WHERE NOT EXISTS (SELECT 1 FROM public.room_participants p WHERE p.room_id = room.id AND p.player_number = n)
    ORDER BY n LIMIT 1;
  IF assigned IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'room_full'); END IF;
  INSERT INTO public.room_participants(room_id,player_id,is_ready,player_number)
    VALUES(room.id,auth.uid()::text,true,assigned);
  RETURN jsonb_build_object('success', true, 'room_id', room.id, 'player_number', assigned, 'already_joined', false);
END;
$$;
CREATE OR REPLACE FUNCTION public.create_room_and_join(
  level_param INTEGER DEFAULT 1,
  selected_language_param VARCHAR DEFAULT 'en'
)
RETURNS TABLE(id UUID, room_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  INSERT INTO public.game_rooms (room_code, level, status, host_user_id, selected_language, credit_status)
  VALUES (v_code, COALESCE(level_param, 1), 'waiting', auth.uid(), COALESCE(selected_language_param, 'en'), 'pending_credit')
  RETURNING public.game_rooms.id INTO v_id;
  
  INSERT INTO public.room_participants (room_id, player_id, is_ready, player_number)
  VALUES (v_id, auth.uid(), true, 1);
  
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_game_state_reliably(
  room_id_param uuid,
  player_id_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  room_exists boolean;
  participant_exists boolean;
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF player_id_param IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Identity mismatch' USING ERRCODE = '42501'; END IF;
  IF NOT public.player_participates_in_room(room_id_param, auth.uid()::text) THEN RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501'; END IF;

  -- Check if room exists and is active
  SELECT EXISTS(
    SELECT 1 FROM public.game_rooms 
    WHERE id = room_id_param 
    AND status IN ('waiting', 'playing')
  ) INTO room_exists;
  
  IF NOT room_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Check if player is a participant (using provided player_id)
  SELECT EXISTS(
    SELECT 1 FROM public.room_participants 
    WHERE room_id = room_id_param 
    AND player_id = player_id_param
  ) INTO participant_exists;
  
  IF NOT participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;
  
  -- Update connection state (using provided player_id)
  INSERT INTO public.connection_states (room_id, player_id, connection_status, last_ping)
  VALUES (room_id_param, player_id_param, 'connected', NOW())
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    connection_status = 'connected',
    last_ping = NOW(),
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'room_id', room_id_param,
    'player_id', player_id_param,
    'timestamp', NOW()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_current_card_if_missing(
  room_id_param uuid,
  language_param varchar DEFAULT 'en',
  level_param integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_card_value text;
  selected_card_id text;
  room_used_cards text[];
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT public.player_participates_in_room(room_id_param, auth.uid()::text) THEN RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501'; END IF;

  -- Lock the room row to prevent race conditions
  SELECT current_card, used_cards INTO current_card_value, room_used_cards
  FROM public.game_rooms 
  WHERE id = room_id_param
  FOR UPDATE;
  
  -- If current_card already exists, return it (no-op)
  IF current_card_value IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'card_id', current_card_value,
      'already_set', true
    );
  END IF;
  
  -- Call existing robust card selection logic
  selected_card_id := public.select_next_card_robust(
    room_id_param, 
    COALESCE(room_used_cards, '{}'::text[])
  );
  
  IF selected_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_cards_available'
    );
  END IF;
  
  -- Atomically set the card ONLY if still NULL
  UPDATE public.game_rooms 
  SET current_card = selected_card_id
  WHERE id = room_id_param 
    AND current_card IS NULL;
  
  -- Verify the update succeeded
  IF NOT FOUND THEN
    -- Another client beat us to it, fetch the current value
    SELECT current_card INTO current_card_value
    FROM public.game_rooms 
    WHERE id = room_id_param;
    
    RETURN jsonb_build_object(
      'success', true,
      'card_id', current_card_value,
      'already_set', true,
      'race_detected', true
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'card_id', selected_card_id,
    'newly_set', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_response_evaluation(
  response_id_param uuid,
  player_id_param text,
  evaluation_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  response_record record;
  room_record record;
  evaluating_player_number integer;
  responding_player_number integer;
  other_player_id text;
  current_sub_turn text;
  next_player text;
  next_sub_turn text;
  evaluation_count integer;
  total_responses integer;
  game_finished boolean := false;
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF player_id_param IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Identity mismatch' USING ERRCODE = '42501'; END IF;

  -- Get the response record with room info
  SELECT gr.*, rp.player_number as evaluating_player_number
  INTO response_record
  FROM public.game_responses gr
  JOIN public.room_participants rp ON rp.room_id = gr.room_id AND rp.player_id = player_id_param
  WHERE gr.id = response_id_param;
  
  IF response_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'response_not_found');
  END IF;
  
  -- Get room details
  SELECT * INTO room_record
  FROM public.game_rooms 
  WHERE id = response_record.room_id;
  
  IF room_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Prevent self-evaluation
  IF response_record.player_id = player_id_param THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_evaluate_own_response');
  END IF;
  
  -- Update the response with evaluation
  UPDATE public.game_responses 
  SET 
    evaluation = evaluation_data->>'evaluation',
    evaluation_by = player_id_param,
    honesty = (evaluation_data->>'honesty')::integer,
    attraction = (evaluation_data->>'attraction')::integer,
    intimacy = (evaluation_data->>'intimacy')::integer,
    surprise = (evaluation_data->>'surprise')::integer
  WHERE id = response_id_param;
  
  -- Get player numbers
  SELECT player_number INTO evaluating_player_number
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id = player_id_param;
  
  SELECT player_number INTO responding_player_number
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id = response_record.player_id;
  
  -- Get other player for next turn
  SELECT player_id INTO other_player_id
  FROM public.room_participants 
  WHERE room_id = response_record.room_id AND player_id != player_id_param;
  
  current_sub_turn := room_record.question_sub_turn;
  
  -- Determine next phase logic
  IF current_sub_turn = 'first_evaluation' THEN
    -- After first evaluation, second player responds
    next_player := CASE WHEN room_record.current_turn = 'player1' THEN 'player2' ELSE 'player1' END;
    next_sub_turn := 'second_response';
    
    UPDATE public.game_rooms 
    SET 
      current_phase = 'response-input',
      current_turn = next_player,
      question_sub_turn = next_sub_turn
    WHERE id = response_record.room_id;
    
  ELSIF current_sub_turn = 'second_evaluation' THEN
    -- After second evaluation, question is complete
    SELECT COUNT(*) INTO evaluation_count
    FROM public.game_responses 
    WHERE room_id = response_record.room_id 
    AND evaluation IS NOT NULL;
    
    SELECT COUNT(*) INTO total_responses
    FROM public.game_responses 
    WHERE room_id = response_record.room_id 
    AND response IS NOT NULL;
    
    -- Check if game should finish (e.g., after 6 evaluations = 3 complete rounds)
    IF evaluation_count >= 6 THEN
      game_finished := true;
      
      UPDATE public.game_rooms 
      SET 
        current_phase = 'finished',
        finished_at = now(),
        question_completion_status = 'complete'
      WHERE id = response_record.room_id;
    ELSE
      -- Advance to next card
      next_player := CASE WHEN room_record.question_first_responder = 'player1' THEN 'player2' ELSE 'player1' END;
      
      UPDATE public.game_rooms 
      SET 
        current_phase = 'card-display',
        current_turn = next_player,
        question_sub_turn = 'first_response',
        question_first_responder = next_player,
        question_completion_status = 'complete',
        current_card = null,
        current_card_index = current_card_index + 1
      WHERE id = response_record.room_id;
    END IF;
  END IF;
  
  -- Create sync event for evaluation completion
  INSERT INTO public.game_sync (
    room_id, 
    action_type, 
    action_data, 
    triggered_by
  ) VALUES (
    response_record.room_id,
    'evaluation_complete',
    jsonb_build_object(
      'evaluation', evaluation_data->>'evaluation',
      'question', response_record.card_id,
      'response', response_record.response,
      'round_number', response_record.round_number,
      'evaluation_by', player_id_param,
      'responding_player_id', response_record.player_id,
      'evaluating_player_number', evaluating_player_number,
      'responding_player_number', responding_player_number,
      'next_player_number', CASE WHEN next_player = 'player1' THEN 1 ELSE 2 END,
      'total_evaluations', evaluation_count,
      'game_finished', game_finished,
      'sub_turn_completed', current_sub_turn,
      'next_sub_turn', next_sub_turn,
      'timestamp', now()::text
    ),
    player_id_param
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'evaluation_id', response_id_param,
    'next_phase', CASE 
      WHEN game_finished THEN 'finished'
      WHEN current_sub_turn = 'first_evaluation' THEN 'response-input'
      ELSE 'card-display'
    END,
    'next_player', next_player,
    'game_finished', game_finished
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_level_selection(
  room_id_param uuid,
  player_id_param text,
  selected_level_param integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vote_count INTEGER;
  other_player_level INTEGER;
  current_language VARCHAR;
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF player_id_param IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Identity mismatch' USING ERRCODE = '42501'; END IF;
  IF NOT public.player_participates_in_room(room_id_param, auth.uid()::text) THEN RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501'; END IF;
  IF selected_level_param IS NULL OR selected_level_param NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Invalid level'; END IF;

  -- Lock the room for this transaction
  SELECT selected_language INTO current_language 
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  -- Upsert the player's vote (NO UUID CAST - use TEXT directly)
  INSERT INTO public.level_selection_votes (room_id, player_id, selected_level)
  VALUES (room_id_param, player_id_param, selected_level_param)
  ON CONFLICT (room_id, player_id) 
  DO UPDATE SET 
    selected_level = EXCLUDED.selected_level,
    created_at = now();
  
  -- Check how many players have voted
  SELECT COUNT(DISTINCT player_id) INTO vote_count
  FROM public.level_selection_votes 
  WHERE room_id = room_id_param;
  
  -- If only one player has voted, return waiting status
  IF vote_count < 2 THEN
    RETURN jsonb_build_object(
      'status', 'waiting',
      'message', 'Waiting for other player',
      'selected_level', selected_level_param
    );
  END IF;
  
  -- Get the other player's level choice (NO UUID CAST)
  SELECT selected_level INTO other_player_level
  FROM public.level_selection_votes 
  WHERE room_id = room_id_param 
    AND player_id != player_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if levels match
  IF selected_level_param = other_player_level THEN
    -- Levels match! Update game room
    UPDATE public.game_rooms 
    SET 
      level = selected_level_param,
      current_phase = 'card-display',
      current_card = NULL,
      used_cards = '{}',
      current_card_index = 0,
      selected_language = COALESCE(current_language, 'en')
    WHERE id = room_id_param;
    
    -- Clean up votes
    DELETE FROM public.level_selection_votes 
    WHERE room_id = room_id_param;
    
    RETURN jsonb_build_object(
      'status', 'agreed',
      'message', 'Level agreed! Starting game...',
      'selected_level', selected_level_param,
      'countdown', 3
    );
  ELSE
    -- Levels don't match
    RETURN jsonb_build_object(
      'status', 'mismatch',
      'message', 'Different levels selected. Try again.',
      'player_level', selected_level_param,
      'other_level', other_player_level
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'An error occurred processing your selection',
      'details', SQLERRM,
      'code', SQLSTATE
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_proximity_response(
  room_id_param uuid, 
  player_id_param text, 
  is_close_param boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  player_num integer;
  current_room RECORD;
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF player_id_param IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Identity mismatch' USING ERRCODE = '42501'; END IF;
  IF NOT public.player_participates_in_room(room_id_param, auth.uid()::text) THEN RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501'; END IF;

  -- Lock the room for atomic operation
  SELECT * INTO current_room
  FROM public.game_rooms 
  WHERE id = room_id_param 
  FOR UPDATE;
  
  IF current_room IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;
  
  -- Get player number
  SELECT player_number INTO player_num
  FROM public.room_participants 
  WHERE room_id = room_id_param AND player_id = player_id_param;
  
  IF player_num IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'player_not_found');
  END IF;
  
  -- Update the appropriate player response atomically (REMOVED proximity_response legacy field)
  IF player_num = 1 THEN
    UPDATE public.game_rooms 
    SET player1_proximity_response = is_close_param
    WHERE id = room_id_param;
  ELSE
    UPDATE public.game_rooms 
    SET player2_proximity_response = is_close_param
    WHERE id = room_id_param;
  END IF;
  
  -- ALWAYS advance to level selection when ANY player responds
  UPDATE public.game_rooms 
  SET 
    proximity_question_answered = true,
    current_phase = 'level-selection'
  WHERE id = room_id_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'advance_to_level_selection', true,
    'player_number', player_num,
    'single_player_advancement', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_proximity_response error: room_id=%, player_id=%, error=%', 
      room_id_param, player_id_param, SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'database_error',
      'details', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_activity(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Identity must be proven by the JWT, never a supplied UUID.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF user_id_param IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Identity mismatch' USING ERRCODE = '42501'; END IF;

  UPDATE public.profiles 
  SET 
    last_seen = now(),
    last_login = now(),
    updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;
-- Legacy SECURITY DEFINER maintenance helpers are not client APIs. Keep only
-- audited entry points and the helpers used by RLS callable by authenticated
-- clients. Internal trigger/function calls still execute with the owner role.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
    IF fn.signature = ANY(ARRAY[
      to_regprocedure('public.create_room_and_join(integer,character varying)'),
      to_regprocedure('public.join_room_by_code(text,text)'),
      to_regprocedure('public.sync_game_state_reliably(uuid,text)'),
      to_regprocedure('public.set_current_card_if_missing(uuid,character varying,integer)'),
      to_regprocedure('public.submit_response_evaluation(uuid,text,jsonb)'),
      to_regprocedure('public.handle_level_selection(uuid,text,integer)'),
      to_regprocedure('public.handle_proximity_response(uuid,text,boolean)'),
      to_regprocedure('public.update_user_activity(uuid)'),
      to_regprocedure('public.consume_credit_for_room(text)'),
      to_regprocedure('public.is_admin(uuid)'),
      to_regprocedure('public.is_anonymous_session()'),
      to_regprocedure('public.player_participates_in_room(uuid,text)'),
      to_regprocedure('public.user_is_room_host(uuid,uuid)'),
      to_regprocedure('public.has_premium(uuid)'),
      to_regprocedure('public.set_subscription_partner(text)'),
      to_regprocedure('public.promote_to_admin(text)')
    ]) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
    END IF;
  END LOOP;
END $$;
-- Public catalog policies check is_admin even for signed-out visitors.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;

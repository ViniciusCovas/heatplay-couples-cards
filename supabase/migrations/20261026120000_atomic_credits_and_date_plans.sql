-- A checkout claim and credit grant must commit together, even if an edge
-- function is terminated. Call from both the webhook and success-page fallback.
CREATE OR REPLACE FUNCTION public.grant_checkout_credits(
  p_event_id text, p_session_id text, p_event_type text,
  p_user_id uuid, p_credits integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE claimed text; existing public.stripe_events;
BEGIN
  IF p_user_id IS NULL OR p_credits IS NULL OR p_credits <= 0 OR p_credits > 1000
     OR p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$'
     OR p_event_id IS NULL OR length(p_event_id) = 0 THEN
    RAISE EXCEPTION 'Invalid checkout grant';
  END IF;
  INSERT INTO public.stripe_events(event_id, session_id, event_type, user_id, credits_granted)
  VALUES (p_event_id, p_session_id, p_event_type, p_user_id, p_credits)
  ON CONFLICT DO NOTHING RETURNING event_id INTO claimed;
  IF claimed IS NULL THEN
    SELECT * INTO existing FROM public.stripe_events WHERE session_id = p_session_id;
    IF existing.user_id IS DISTINCT FROM p_user_id OR existing.credits_granted IS DISTINCT FROM p_credits THEN
      RAISE EXCEPTION 'Checkout grant conflict';
    END IF;
    RETURN jsonb_build_object('already_processed', true, 'credits_added', existing.credits_granted);
  END IF;
  PERFORM public.add_credits(p_user_id, p_credits);
  RETURN jsonb_build_object('already_processed', false, 'credits_added', p_credits);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_checkout_credits(text,text,text,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_checkout_credits(text,text,text,uuid,integer) TO service_role;

-- Counters contain no questions, answers, preferences or model output.
CREATE TABLE public.date_plan_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_day date NOT NULL DEFAULT current_date,
  requests integer NOT NULL DEFAULT 0
);
ALTER TABLE public.date_plan_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.date_plan_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_date_plan(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE claimed uuid;
BEGIN
  -- Serialize the daily cap as well as per-user counters across instances.
  PERFORM pg_advisory_xact_lock(72614201);
  IF (SELECT COALESCE(sum(requests), 0) FROM public.date_plan_usage WHERE usage_day = current_date) >= 500 THEN
    RETURN false;
  END IF;
  INSERT INTO public.date_plan_usage(user_id, usage_day, requests) VALUES(p_user_id, current_date, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET usage_day = current_date,
        requests = CASE WHEN date_plan_usage.usage_day = current_date THEN date_plan_usage.requests + 1 ELSE 1 END
    WHERE date_plan_usage.usage_day <> current_date OR date_plan_usage.requests < 5
  RETURNING user_id INTO claimed;
  RETURN claimed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_date_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_date_plan(uuid) TO service_role;

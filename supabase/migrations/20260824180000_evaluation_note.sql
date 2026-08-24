-- ============================================================================
-- LISTENER NOTE ON AN EVALUATION  (documentation-only migration)
-- ============================================================================
-- Context
-- -------
-- Couples play GetClose sitting together and answer every question OUT LOUD.
-- Every room runs in close-proximity mode, so `game_responses.response` has
-- always been the literal i18n placeholder ("Spoken response" / "Resposta
-- falada") for every single row: there is no real answer text anywhere in the
-- database, and the end-of-session AI analysis was in practice built on the
-- 1-5 ratings alone.
--
-- The fix extends the existing evaluation step: after their partner answers
-- aloud, the LISTENER may optionally write one short line (<= 140 chars)
-- about what stayed with them. That line is the only real human language the
-- analysis ever sees.
--
-- Storage decision: NO SCHEMA CHANGE
-- ----------------------------------
-- The note is stored as `note` inside the JSON already held in the existing
-- `public.game_responses.evaluation` (text) column, alongside the four
-- ratings and the pre-existing nested `timing_context` object.
--
-- Why not a dedicated `evaluation_note` column:
--   1. `evaluation` is already a JSON document with nested objects, so this
--      is not a new pattern - it is the pattern.
--   2. The note is written in the SAME UPDATE statement as the ratings. One
--      column means one atomic write and no possibility of the note and the
--      ratings disagreeing.
--   3. RLS: 20260824120000_launch_security_hardening.sql made responses
--      immutable except for two columns:
--          GRANT UPDATE (evaluation, evaluation_by)
--            ON public.game_responses TO anon, authenticated;
--      `evaluation` is already in that grant, so the write is permitted as-is
--      and the immutability guarantee (the answer text itself can never be
--      rewritten) is untouched. A new column would have required widening
--      that grant - a silent-failure trap and a real, if small, widening of
--      the write surface for no gain.
--   4. There is no query workload that needs the note in its own column: it
--      is read whole, per room, by the getclose-ai-analysis edge function
--      (service role) and by the couple's own analysis screen. No filtering,
--      no aggregation, no index.
--
-- Backward compatibility: the key is absent on every historical row and on
-- every submission where the listener skips the (strictly optional) field.
-- All readers treat a missing `note` as "no note".
--
-- This migration therefore changes no structure and no policy. It only
-- records the shape of the column so the next person to read the schema does
-- not have to reverse-engineer it from the client.
-- ============================================================================

COMMENT ON COLUMN public.game_responses.evaluation IS
  'JSON document written by the partner who LISTENED to this answer. Shape: {honesty,attraction,intimacy,surprise: int 1-5, timing_context: {evaluation_timestamp: epoch ms}, note?: text <=140 chars}. `note` is the listener''s optional one-line impression of what their partner said out loud (answers are spoken in person and never recorded); it is absent on rows written before the field existed and whenever the listener skipped it. Only `evaluation` and `evaluation_by` are client-updatable (see 20260824120000_launch_security_hardening.sql); the answer row is otherwise immutable.';

COMMENT ON COLUMN public.game_responses.response IS
  'Legacy answer text. In close-proximity (spoken) play - which is every room today - this holds a localized "Spoken response" placeholder, NOT anything the player said. Never surface it to users or feed it to a model; use evaluation->>''note'' instead.';

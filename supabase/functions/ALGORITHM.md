# GetClose AI / Game Algorithm

How the AI-driven parts of the game work, end to end. All AI calls use OpenAI
(`gpt-4o-mini`) via the Chat Completions API with `response_format: json_object`.

## 1. Question selection (`intelligent-question-selector`)

Called by `src/pages/Game.tsx` each time a new card is needed.

Flow:
1. **Validate input** — `roomId` must be a UUID, `currentLevel` an integer 1–10;
   otherwise 400.
2. **Access guard** — room must be an ACTIVE game; identified callers must be
   host/participant (`_shared/guards.ts`).
3. **Language** — the room's `game_rooms.selected_language` always wins over
   the client-sent `language`, so both players get questions in the language
   the room was created with.
4. **Fetch** — last 2 evaluated responses, the level id (cached 5 min in
   memory), and up to 50 random active questions for the level+language via
   the `get_random_questions_for_level` RPC.
5. **Repetition filter** — questions whose **id OR text** appears in
   `game_rooms.used_cards` are excluded. (The DB trigger
   `handle_evaluation_completion_v5` stores question *ids* in `used_cards`;
   older client code stored *text* — both formats are matched.)
6. **Candidate pool** — the first `CANDIDATE_POOL_SIZE` (20) of the already
   randomized available questions are shown to the model.
7. **AI selection** — a compact prompt gives the model the last evaluation
   (1–5 scale), the categories of the couple's most recent cards (with an
   instruction to vary category so the session progresses instead of looping),
   and the numbered candidate list. The model returns
   `{selectedQuestionIndex, reasoning, targetArea}` as strict JSON.
8. **Validation + fallback** — if the OpenAI call fails (after 3 retries with
   exponential backoff and a 30 s timeout) or the index is invalid, a
   *smart random fallback* picks: intro-flavored questions for the first card,
   otherwise a question in a category not just used, ideally targeting the
   couple's lowest-scoring dimension.
9. **Telemetry** — every selection (AI or fallback) is inserted into
   `ai_analyses` with `analysis_type = 'question_selection'` /
   `'question_selection_fallback'`.

Response shape: `{question, reasoning, targetArea, selectionMethod}` (plus
`fallbackReason` on fallback).

## 2. Evaluation flow

Players rate each other's answers 1–5 on **honesty, attraction, intimacy,
surprise** (`src/components/game/ResponseEvaluation.tsx`). The rating is stored
as a JSON string in `game_responses.evaluation`. The DB trigger
`handle_evaluation_completion_v5` advances the turn, appends the current card
id to `used_cards`, picks the next card via `select_next_card_robust` (a pure
SQL fallback path), and finishes the game after 6 evaluations.

## 3. Final analysis (`getclose-ai-analysis`)

Called at game end; result rendered by `src/pages/FullAnalysis.tsx` and the
insights components, and re-read later from `ai_analyses.ai_response`
(`analysis_type = 'getclose-ai-analysis'`).

Flow:
1. Validate `roomId` (UUID) → 400 on bad input; access guard as above.
2. Language = `game_rooms.selected_language` (fallback: request `language`).
   The prompt requires **every human-readable string** in that language.
3. Load all `game_responses` + their questions. **Explicit errors, never
   silent zeros**: no responses → 422 `NO_RESPONSES`; no parseable
   evaluations → 422 `NO_EVALUATIONS`. Malformed evaluation JSON rows are
   *skipped* (counted in `input_data.invalid_evaluations`), not treated as 0s.
4. **Deterministic metrics computed server-side** (never asked of the model):
   averages, bond map (closeness/spark/anchor), volatility (std dev),
   honesty–intimacy & attraction–surprise correlations, primary dynamic,
   communication style, `compatibilityScore = bondMapAvg × 20` (0–100),
   relationship phase, breakthrough moments (any dimension ≥ 4.5), top-scored
   answers.
5. **AI narrative** — the model receives the metrics **and up to 12 actual
   Q&A pairs** (answers truncated to 180 chars) and writes only the narrative
   fields. Tone: warm, specific to their actual answers, positive but honest,
   18+ friendly, never clinical.
6. **Robust parsing** — strict `json_object` mode, defensive JSON extraction,
   schema validation of required fields, and **one retry** with the validation
   error echoed back. If both attempts fail → 502 `AI_GENERATION_FAILED`
   (client-showable message), nothing is stored.
7. Server-computed blocks (`compatibilityScore`, `intelligenceMarkers`,
   `specificMoments`, `responseQuotes`, `advancedMetrics`) are merged into the
   model's narrative, overwriting anything hallucinated, then the whole object
   is stored in `ai_analyses` and returned as `{success: true, analysis}`.

### Output schema (backward compatible — fields only added, none removed)

```jsonc
{
  // NEW — wow-factor fields
  "archetype": "The Slow-Burn Explorers",        // memorable 2-4 word couple name
  "archetypeDescription": "…why it fits them…",
  "shareable_insight": "≤140-char screenshot-worthy quote about the couple",
  "next_step": {
    "suggestedLevel": 3,                          // computed: level+1 if score ≥ 70
    "title": "…",
    "description": "what to try next session and why"
  },

  // Existing fields (unchanged shape)
  "compatibilityScore": 0-100,                    // server-computed
  "relationshipPhase": "exploring|building|deepening|mastering",
  "strengthAreas":  [{ "area", "score", "insight" }],
  "growthAreas":    [{ "area", "score", "recommendation" }],
  "keyInsights":    ["…", "…", "…"],
  "personalizedTips": ["…", "…", "…"],
  "culturalNotes": "…",
  "nextSessionRecommendation": "…",
  "intelligenceMarkers": { "primaryDynamic", "communicationDNA", "volatilityProfile",
                           "rarityPercentile", "dataPoints", "analysisDepth" },
  "specificMoments":  [{ "questionNumber", "type", "score", "insight", "significance" }],
  "responseQuotes":   [{ "questionIndex", "questionText", "responsePreview",
                         "overallScore", "breakdown": {honesty, attraction, intimacy, surprise} }],
  "advancedMetrics":  { "honestyIntimacyCorrelation", "attractionSurpriseCorrelation",
                        "overallVolatility", "averageResponseTime", "breakthroughFrequency" }
}
```

## 4. Queue processor (`process-game-queue`)

Cron-only (internal secret guard). Runs the SQL recovery RPCs:
`auto_recover_technical_issues`, `detect_disconnected_players`,
`process_game_flow_queue`, `detect_and_fix_stuck_rooms`. No AI involved.

## 5. Knobs to tune

Constants at the top of each function:

| Knob | File | Default | Effect |
|---|---|---|---|
| `OPENAI_MODEL` | both | `gpt-4o-mini` | quality vs cost |
| `SELECTOR_TEMPERATURE` | selector | 0.7 | selection variety |
| `SELECTOR_MAX_TOKENS` | selector | 250 | reasoning length cap |
| `CANDIDATE_POOL_SIZE` | selector | 20 | questions shown to model (prompt cost) |
| `ANALYSIS_TEMPERATURE` | analysis | 0.7 | narrative creativity |
| `ANALYSIS_MAX_TOKENS` | analysis | 1400 | analysis length/cost cap |
| `MAX_RESPONSES_IN_PROMPT` | analysis | 12 | how many Q&A pairs the model sees |
| `MAX_QUOTED_RESPONSE_CHARS` | analysis | 180 | per-answer excerpt length |
| `OPENAI_TIMEOUT_MS` | both | 30s / 45s | abort threshold |
| breakthrough threshold | analysis | 4.5 | sensitivity of "moments" |
| `compatibilityScore` formula | analysis | bondMapAvg×20 | headline score |
| next-level threshold | analysis | score ≥ 70 | when to suggest advancing |

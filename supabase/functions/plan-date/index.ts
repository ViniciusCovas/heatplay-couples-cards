import { getCorsHeaders } from '../_shared/cors.ts';
import { getCallerUser, serviceClient } from '../_shared/guards.ts';
import { cardCount, eligibleCards, isPreferences, validateDateDeck } from '../_shared/date-deck.ts';
import { QUESTIONS } from '../_shared/spark-questions.ts';

Deno.serve(async (req: Request) => {
  const headers = { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const caller = await getCallerUser(req);
  if (!caller) return json({ error: 'authentication_required' }, 401);
  const p: unknown = await req.json().catch(() => null);
  if (!isPreferences(p)) return json({ error: 'invalid_preferences' }, 400);
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return json({ error: 'planner_unavailable' }, 503);
  try {
    const { data: allowed, error } = await serviceClient().rpc('claim_date_plan', { p_user_id: caller.id });
    if (error) return json({ error: 'planner_unavailable' }, 503);
    if (!allowed) return json({ error: 'daily_limit' }, 429);
    // No user text, answers, names or inferred personality reach the model.
    const catalog = eligibleCards(p).map(c => ({ ...c, question: QUESTIONS.en[c.id] }));
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(6000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 250,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Arrange an adult couple’s card evening using ONLY IDs from the supplied editorial catalog. Return JSON {"cards": [integer IDs]}. No repeated IDs. Start with heat 0 and depth 0. End with ID 8, 33, or 52. Vary playful and reflective moments, respecting the supplied mood; do not force escalation. Never write questions, advice or judgments.' },
          { role: 'user', content: JSON.stringify({ mood: p.mood, count: cardCount(p), catalog }) },
        ],
      }),
    });
    if (!response.ok) return json({ error: 'planner_unavailable' }, 503);
    const completion = await response.json();
    const plan = JSON.parse(completion.choices?.[0]?.message?.content ?? '{}');
    if (!validateDateDeck(plan.cards, p)) return json({ error: 'invalid_plan' }, 502);
    return json({ cards: plan.cards, source: 'ai' });
  } catch {
    // Avoid logging preferences, model content or bearer tokens.
    return json({ error: 'planner_unavailable' }, 503);
  }
});

/**
 * stripe-webhook
 *
 * Source of truth for granting purchased credits.
 *
 * - Authenticated exclusively by the Stripe webhook signature
 *   (STRIPE_WEBHOOK_SECRET). verify_jwt is disabled in config.toml because
 *   Stripe cannot send Supabase JWTs.
 * - Handles checkout.session.completed (and async_payment_succeeded) and
 *   grants credits via the add_credits RPC using the session metadata that
 *   create-payment wrote (user_id, credits).
 * - Idempotent: every grant is claimed in public.stripe_events first
 *   (event_id PK + UNIQUE(session_id)). Retried webhook deliveries and the
 *   verify-payment fallback path can never double-grant.
 *
 * No CORS headers on purpose: this endpoint is server-to-server only.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { serviceClient } from "../_shared/guards.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("stripe-webhook: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not configured");
    return json({ error: "Webhook not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, 400);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  // Verify the signature against the RAW body (never parse first).
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-webhook: signature verification failed:", msg);
    return json({ error: "Invalid signature" }, 400);
  }

  // Only checkout completions grant credits. Everything else is acknowledged
  // so Stripe stops retrying.
  const relevant =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";

  if (!relevant) {
    return json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    // completed but unpaid (e.g. delayed payment method) - the
    // async_payment_succeeded event will follow if it settles.
    console.log(`stripe-webhook: session ${session.id} not paid yet (${session.payment_status})`);
    return json({ received: true, pending: true });
  }

  const userId = session.metadata?.user_id;
  const credits = parseInt(session.metadata?.credits || "0", 10);
  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (!userId || !uuidRe.test(userId) || !Number.isFinite(credits) || credits <= 0) {
    // Metadata written by our create-payment function is malformed/absent.
    // Acknowledge (retrying will not fix it) but log loudly.
    console.error(`stripe-webhook: invalid metadata on session ${session.id}`, session.metadata);
    return json({ received: true, error: "invalid_metadata" });
  }

  const supabase = serviceClient();

  // ---- Idempotency claim -------------------------------------------------
  // Insert the ledger row FIRST. The PK on event_id kills webhook redelivery
  // duplicates; the UNIQUE on session_id kills races with verify-payment.
  const { error: claimError } = await supabase.from("stripe_events").insert({
    event_id: event.id,
    session_id: session.id,
    event_type: event.type,
    user_id: userId,
    credits_granted: credits,
  });

  if (claimError) {
    if (claimError.code === "23505") {
      // Already processed (redelivery or verify-payment won the race).
      console.log(`stripe-webhook: session ${session.id} already processed, skipping`);
      return json({ received: true, duplicate: true });
    }
    console.error("stripe-webhook: failed to record event:", claimError);
    return json({ error: "Failed to record event" }, 500); // let Stripe retry
  }

  // ---- Grant credits -----------------------------------------------------
  const { error: grantError } = await supabase.rpc("add_credits", {
    user_id_param: userId,
    credits_amount: credits,
  });

  if (grantError) {
    console.error("stripe-webhook: add_credits failed:", grantError);
    // Roll back the claim so a Stripe retry can attempt the grant again.
    await supabase.from("stripe_events").delete().eq("event_id", event.id);
    return json({ error: "Failed to grant credits" }, 500); // let Stripe retry
  }

  console.log(`stripe-webhook: granted ${credits} credits to ${userId} (session ${session.id})`);
  return json({ received: true, credits_granted: credits });
});

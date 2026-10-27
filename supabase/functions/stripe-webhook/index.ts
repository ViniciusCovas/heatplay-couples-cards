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

  // ---- Close Premium subscription lifecycle -------------------------------
  // customer.subscription.created/updated/deleted keep public.subscriptions
  // in sync. Upserts are idempotent by nature (keyed on the Stripe
  // subscription id and written with the latest object state), so no ledger
  // claim is needed for them.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return await handleSubscriptionEvent(stripe, event);
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

  // Subscription checkouts carry no credits: sync the subscription row
  // instead of the credit path. Idempotent via the stripe_events ledger.
  if (session.mode === "subscription") {
    return await handleSubscriptionCheckout(stripe, event, session);
  }

  if (session.payment_status !== "paid") {
    // completed but unpaid (e.g. delayed payment method) - the
    // async_payment_succeeded event will follow if it settles.
    console.log(`stripe-webhook: session ${session.id} not paid yet (${session.payment_status})`);
    return json({ received: true, pending: true });
  }

  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits || "0");
  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (!userId || !uuidRe.test(userId) || !Number.isInteger(credits) || credits <= 0 || credits > 1000) {
    // Metadata written by our create-payment function is malformed/absent.
    // Acknowledge (retrying will not fix it) but log loudly.
    console.error(`stripe-webhook: invalid metadata on session ${session.id}`, session.metadata);
    return json({ received: true, error: "invalid_metadata" });
  }

  const supabase = serviceClient();

  const { data: grant, error: grantError } = await supabase.rpc("grant_checkout_credits", {
    p_event_id: event.id,
    p_session_id: session.id,
    p_event_type: event.type,
    p_user_id: userId,
    p_credits: credits,
  });
  if (grantError) return json({ error: "Failed to grant checkout credits" }, 500);
  return json({ received: true, duplicate: grant.already_processed, credits_granted: grant.credits_added });

});

// ============================================================================
// Close Premium subscription handlers
// ============================================================================

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Map a Stripe subscription status onto our 4-value column. */
function mapStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}

/** Upsert the public.subscriptions row from a Stripe subscription object. */
async function upsertSubscription(
  sub: Stripe.Subscription,
  overrideStatus?: string,
): Promise<Response> {
  const userId = sub.metadata?.user_id;
  const plan = sub.metadata?.plan;

  if (!userId || !UUID_RE.test(userId)) {
    // Not one of ours (or metadata lost) — acknowledge; retrying won't help.
    console.error(`stripe-webhook: subscription ${sub.id} has no valid user_id metadata`);
    return json({ received: true, error: "invalid_metadata" });
  }

  const supabase = serviceClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      stripe_subscription_id: sub.id,
      plan: plan === "monthly" || plan === "yearly" ? plan : null,
      status: overrideStatus ?? mapStatus(sub.status),
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    console.error("stripe-webhook: subscription upsert failed:", error);
    return json({ error: "Failed to sync subscription" }, 500); // let Stripe retry
  }

  console.log(`stripe-webhook: synced subscription ${sub.id} for ${userId}`);
  return json({ received: true, subscription_synced: true });
}

/** customer.subscription.created / updated / deleted */
async function handleSubscriptionEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<Response> {
  // Fetch current state: Stripe may deliver lifecycle events out of order.
  let sub: Stripe.Subscription;
  try { sub = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id); }
  catch { return json({ error: "Failed to retrieve subscription" }, 500); }
  const overrideStatus = event.type === "customer.subscription.deleted" ? "canceled" : undefined;
  return await upsertSubscription(sub, overrideStatus);
}

/**
 * checkout.session.completed with mode=subscription.
 *
 * Usually customer.subscription.created arrives too, but ordering is not
 * guaranteed; syncing here as well makes premium available immediately after
 * checkout. Repeated upserts are safe; never claim before persisting state.
 */
async function handleSubscriptionCheckout(
  stripe: Stripe,
  _event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<Response> {
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId) {
    console.error(`stripe-webhook: subscription checkout ${session.id} has no subscription id`);
    return json({ received: true, error: "missing_subscription" });
  }

  // Fetch the full subscription so metadata/status/period are authoritative.
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    console.error("stripe-webhook: failed to retrieve subscription:", err);
    return json({ error: "Failed to retrieve subscription" }, 500); // retry
  }

  // Checkout metadata is the fallback if subscription_data.metadata was lost.
  if (!sub.metadata?.user_id && session.metadata?.user_id) {
    sub.metadata = { ...sub.metadata, ...session.metadata };
  }

  return await upsertSubscription(sub);
}

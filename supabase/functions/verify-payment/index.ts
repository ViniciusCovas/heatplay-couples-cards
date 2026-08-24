/**
 * verify-payment (hardened)
 *
 * Called by the success page to confirm a checkout. The stripe-webhook
 * function is the source of truth for granting credits; this function:
 *
 *  1. Requires an AUTHENTICATED caller (a real user JWT, not the anon key).
 *  2. Requires that the caller is the same user the checkout session was
 *     created for (session.metadata.user_id) - previously any caller could
 *     replay any session_id and mint credits.
 *  3. Never double-grants: the public.stripe_events ledger (UNIQUE on
 *     session_id) is checked/claimed first. If the webhook already processed
 *     the session this simply reports success. Only when the webhook has not
 *     arrived yet (e.g. webhook misconfigured or delayed) does it grant as a
 *     fallback, through the same idempotency claim, so the two paths can
 *     never both credit the same session.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCallerUser, serviceClient } from "../_shared/guards.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- 1. Authenticate the caller -------------------------------------
    const caller = await getCallerUser(req);
    if (!caller) {
      return json({ success: false, error: "Authentication required" }, 401);
    }

    // ---- 2. Validate input ----------------------------------------------
    const body = await req.json().catch(() => ({}));
    const sessionId: unknown = body?.session_id;
    if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return json({ success: false, error: "Missing or invalid session_id" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // ---- 3. Retrieve the session from Stripe ----------------------------
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metadataUserId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    // The session must belong to the calling user.
    if (!metadataUserId || metadataUserId !== caller.id) {
      console.warn(
        `verify-payment: caller ${caller.id} attempted to verify session for ${metadataUserId}`,
      );
      return json({ success: false, error: "This payment does not belong to your account" }, 403);
    }

    if (session.payment_status !== "paid") {
      return json({ success: false, status: "pending", error: "Payment not completed" }, 400);
    }

    if (!Number.isFinite(credits) || credits <= 0) {
      return json({ success: false, error: "Invalid credits metadata" }, 400);
    }

    const supabase = serviceClient();

    // ---- 4. Already processed? (webhook is the source of truth) ---------
    const { data: existing, error: lookupError } = await supabase
      .from("stripe_events")
      .select("event_id, credits_granted")
      .eq("session_id", session.id)
      .maybeSingle();

    if (lookupError) {
      console.error("verify-payment: ledger lookup failed:", lookupError);
      throw new Error("Failed to verify payment status");
    }

    if (existing) {
      return json({
        success: true,
        credits_added: existing.credits_granted ?? credits,
        already_processed: true,
      });
    }

    // ---- 5. Fallback grant (webhook not seen yet), idempotent -----------
    // Claim the session in the ledger first; UNIQUE(session_id) guarantees
    // that a concurrently arriving webhook cannot also grant.
    const { error: claimError } = await supabase.from("stripe_events").insert({
      event_id: `verify_${session.id}`,
      session_id: session.id,
      event_type: "verify-payment.grant",
      user_id: caller.id,
      credits_granted: credits,
    });

    if (claimError) {
      if (claimError.code === "23505") {
        // The webhook won the race between our lookup and our claim.
        return json({ success: true, credits_added: credits, already_processed: true });
      }
      console.error("verify-payment: failed to claim session:", claimError);
      throw new Error("Failed to record payment");
    }

    const { error: grantError } = await supabase.rpc("add_credits", {
      user_id_param: caller.id,
      credits_amount: credits,
    });

    if (grantError) {
      console.error("verify-payment: add_credits failed:", grantError);
      // Roll back the claim so the webhook (or a retry) can grant later.
      await supabase.from("stripe_events").delete().eq("event_id", `verify_${session.id}`);
      throw new Error("Failed to add credits to account");
    }

    return json({ success: true, credits_added: credits });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Payment verification error:", error);
    return json({ success: false, error: errorMessage }, 500);
  }
});

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

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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
    const credits = Number(session.metadata?.credits || "0");

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

    if (!Number.isInteger(credits) || credits <= 0 || credits > 1000) {
      return json({ success: false, error: "Invalid credits metadata" }, 400);
    }

    const supabase = serviceClient();

    // Ledger insert + credits happen in one database transaction.
    const { data: grant, error: grantError } = await supabase.rpc("grant_checkout_credits", {
      p_event_id: `verify_${session.id}`,
      p_session_id: session.id,
      p_event_type: "verify-payment.grant",
      p_user_id: caller.id,
      p_credits: credits,
    });
    if (grantError) throw new Error("Failed to grant checkout credits");
    return json({ success: true, ...grant });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Payment verification error:", error);
    return json({ success: false, error: errorMessage }, 500);
  }
});

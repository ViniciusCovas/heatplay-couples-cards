import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAllowedOrigins, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { package_type, mode, plan } = await req.json();

    // Credit packages
    const packages = {
      "first_spark": { credits: 1, price: 350, name: "First Spark - 1 Sesión" },
      "date_night_duo": { credits: 2, price: 500, name: "Date-Night Duo - 2 Sesiones" },
      "weekend_blaze": { credits: 4, price: 900, name: "Weekend Blaze - 4 Sesiones" },
      "endless_heat": { credits: 10, price: 1750, name: "Endless Heat Pass - 10 Sesiones" }
    };

    const isSubscription = mode === "subscription";

    // Close Premium subscription plans (Stripe price IDs configured via env)
    const premiumPrices: Record<string, string | undefined> = {
      monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY"),
      yearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY"),
    };

    let selectedPackage: { credits: number; price: number; name: string } | null = null;
    let premiumPriceId: string | null = null;

    if (isSubscription) {
      if (plan !== "monthly" && plan !== "yearly") {
        throw new Error("Invalid subscription plan");
      }
      premiumPriceId = premiumPrices[plan] ?? null;
      if (!premiumPriceId) {
        throw new Error(`Stripe price for plan '${plan}' is not configured`);
      }
    } else {
      selectedPackage = packages[package_type as keyof typeof packages] ?? null;
      if (!selectedPackage) {
        throw new Error("Invalid package type");
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Only redirect back to an allowed origin (never a spoofed Origin header).
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = req.headers.get("origin")?.replace(/\/+$/, "");
    const safeOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

    if (isSubscription) {
      // Close Premium subscription checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: premiumPriceId!, quantity: 1 }],
        mode: "subscription",
        success_url: `${safeOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}&mode=subscription&plan=${plan}`,
        cancel_url: `${safeOrigin}/premium`,
        metadata: {
          user_id: user.id,
          plan: plan,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan: plan,
          },
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: selectedPackage!.name,
              description: `${selectedPackage!.credits} sesión${selectedPackage!.credits > 1 ? 'es' : ''} de Let's Get Close`
            },
            unit_amount: selectedPackage!.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${safeOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}&credits=${selectedPackage!.credits}`,
      cancel_url: `${safeOrigin}/`,
      metadata: {
        user_id: user.id,
        credits: selectedPackage!.credits.toString(),
        package_type: package_type
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
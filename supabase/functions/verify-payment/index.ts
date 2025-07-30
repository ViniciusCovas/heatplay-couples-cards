import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const body = await req.json();
    const { session_id } = body;
    
    if (!session_id) {
      logStep("ERROR: Missing session_id", { body });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing session_id parameter" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Session ID received", { session_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not found");
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    logStep("Stripe initialized");

    // Retrieve the session
    logStep("Retrieving Stripe session", { session_id });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { 
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      customer_email: session.customer_details?.email 
    });
    
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase environment variables", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );
    logStep("Supabase client initialized");

    // Get user ID and credits from metadata
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0");
    
    logStep("Session metadata", { 
      userId, 
      credits, 
      metadata: session.metadata 
    });

    if (!userId || !credits) {
      logStep("ERROR: Missing metadata", { userId, credits });
      throw new Error("Missing user ID or credits in session metadata");
    }

    // Add credits to user account
    logStep("Adding credits to user account", { userId, credits });
    const { data, error } = await supabaseClient.rpc('add_credits', {
      user_id_param: userId,
      credits_amount: credits
    });

    if (error) {
      logStep("ERROR: Failed to add credits", { error });
      console.error("Error adding credits:", error);
      throw new Error("Failed to add credits to account");
    }
    
    logStep("Credits added successfully", { data, credits_added: credits });

    return new Response(JSON.stringify({ 
      success: true, 
      credits_added: credits,
      data 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Payment verification failed", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined 
    });
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
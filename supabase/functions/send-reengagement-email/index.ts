import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { ReengagementEmail } from "../_shared/email-templates/templates/ReengagementEmail.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Create Supabase client with service role key for admin access
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting re-engagement email campaign...");

    // Get users who haven't been active in 14+ days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: inactiveUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('email, user_id, last_seen')
      .lt('last_seen', fourteenDaysAgo.toISOString())
      .eq('role', 'user'); // Only send to regular users, not admins

    if (error) {
      console.error("Error fetching inactive users:", error);
      throw error;
    }

    console.log(`Found ${inactiveUsers?.length || 0} inactive users`);

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No inactive users found",
        emails_sent: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let emailsSent = 0;
    const errors: any[] = [];

    // Send re-engagement email to each inactive user
    for (const user of inactiveUsers) {
      try {
        const daysSinceLastSeen = Math.floor((new Date().getTime() - new Date(user.last_seen).getTime()) / (1000 * 60 * 60 * 24));
        
        // Render the React Email template
        const emailHtml = await renderAsync(
          React.createElement(ReengagementEmail, {
            email: user.email,
            last_seen: user.last_seen,
            days_inactive: daysSinceLastSeen,
          })
        );
        
        const emailResponse = await resend.emails.send({
          from: "Connection Cards <hello@resend.dev>",
          to: [user.email],
          subject: "We miss you! Come back to Connection Cards 💕",
          html: emailHtml,
        });

        console.log(`Re-engagement email sent to: ${user.email}`);
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        errors.push({ email: user.email, error: emailError.message });
      }
    }

    console.log(`Re-engagement campaign completed. Emails sent: ${emailsSent}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Re-engagement campaign completed",
      emails_sent: emailsSent,
      total_inactive_users: inactiveUsers.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in re-engagement campaign:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { WelcomeEmail } from "../_shared/email-templates/templates/WelcomeEmail.tsx";

import { getCorsHeaders } from "../_shared/cors.ts";
import { requireInternalSecret } from "../_shared/guards.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface WelcomeEmailRequest {
  email: string;
  user_id: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is only invoked internally (auth.users trigger via pg_net).
  // It must never be publicly callable: it would let anyone send branded
  // email to arbitrary addresses through our Resend account.
  const secretCheck = requireInternalSecret(req);
  if (!secretCheck.ok) {
    console.warn("send-welcome-email: rejected request without valid internal secret");
    return new Response(JSON.stringify({ success: false, error: secretCheck.error }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { email, user_id, created_at }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to: ${email} (User ID: ${user_id})`);

    // Render the React Email template
    const emailHtml = await renderAsync(
      React.createElement(WelcomeEmail, {
        email,
        user_id,
        created_at,
      })
    );

    const emailResponse = await resend.emails.send({
      from: "Connection Cards <welcome@letsgetclose.com>",
      to: [email],
      subject: "Welcome to Connection Cards! 💕",
      html: emailHtml,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      email_id: emailResponse.data?.id,
      message: "Welcome email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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
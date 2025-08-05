import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";

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
        const emailResponse = await resend.emails.send({
          from: "Connection Cards <hello@resend.dev>",
          to: [user.email],
          subject: "We miss you! Ready to reconnect? 💕",
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>We Miss You!</title>
              <style>
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  margin: 0; 
                  padding: 0; 
                  background: linear-gradient(135deg, #ff6b6b, #4ecdc4); 
                  color: #333; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
                }
                .header { 
                  background: linear-gradient(135deg, #ff6b6b, #4ecdc4); 
                  padding: 40px 20px; 
                  text-align: center; 
                  color: white; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 700; 
                }
                .content { 
                  padding: 40px 30px; 
                  line-height: 1.6; 
                }
                .cta-button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #ff6b6b, #4ecdc4); 
                  color: white; 
                  text-decoration: none; 
                  padding: 15px 30px; 
                  border-radius: 25px; 
                  font-weight: 600; 
                  margin: 20px 0; 
                  text-align: center; 
                }
                .footer { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 14px; 
                  color: #666; 
                }
                .unsubscribe { 
                  font-size: 12px; 
                  color: #999; 
                  margin-top: 10px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>We miss you! 💕</h1>
                  <p>Your relationship deserves meaningful conversations</p>
                </div>
                
                <div class="content">
                  <h2>Ready to reconnect with your partner?</h2>
                  
                  <p>We noticed you haven't been on Connection Cards in a while, and we wanted to reach out because we believe every relationship deserves those deep, meaningful moments of connection.</p>
                  
                  <p><strong>What's new since you've been away:</strong></p>
                  <ul>
                    <li>🤖 Enhanced AI question selection for even better conversations</li>
                    <li>🔥 New intimacy levels and question categories</li>
                    <li>📊 Improved relationship insights and analysis</li>
                    <li>🌍 Expanded language support</li>
                  </ul>
                  
                  <p>Life gets busy, but your relationship is worth investing in. Take just 15 minutes today to rediscover something new about each other.</p>
                  
                  <a href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com" class="cta-button">
                    Start a New Game Together
                  </a>
                  
                  <p><strong>Quick reminder of what makes Connection Cards special:</strong></p>
                  <ul>
                    <li>🎯 Questions tailored by AI to your relationship dynamic</li>
                    <li>💬 Safe space to share thoughts and feelings</li>
                    <li>📈 Track your connection over time</li>
                    <li>🎮 Fun, game-like experience that brings you closer</li>
                  </ul>
                  
                  <p>Your partner is waiting - create a room and start connecting today!</p>
                </div>
                
                <div class="footer">
                  <p>Thanks for being part of the Connection Cards community!</p>
                  <div class="unsubscribe">
                    <p>Don't want to receive these emails? You can update your preferences in your account settings.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
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
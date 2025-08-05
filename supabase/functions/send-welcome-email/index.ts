import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  user_id: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, user_id }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to: ${email} (User ID: ${user_id})`);

    const emailResponse = await resend.emails.send({
      from: "Connection Cards <welcome@resend.dev>",
      to: [email],
      subject: "Welcome to Connection Cards! 💕",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Connection Cards</title>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Connection Cards! 💕</h1>
              <p>Deepen your relationships through meaningful conversations</p>
            </div>
            
            <div class="content">
              <h2>Ready to strengthen your connection?</h2>
              
              <p>Welcome to Connection Cards - the AI-powered couples game that helps you discover new depths in your relationship through thoughtfully crafted conversation prompts.</p>
              
              <p><strong>What you can expect:</strong></p>
              <ul>
                <li>🎯 AI-selected questions tailored to your relationship</li>
                <li>🔥 Progressive intimacy levels from spark to deep connection</li>
                <li>💬 Real-time multiplayer experience with your partner</li>
                <li>📊 Relationship insights and compatibility analysis</li>
                <li>🌍 Available in multiple languages</li>
              </ul>
              
              <p>Your journey to deeper connection starts now!</p>
              
              <a href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com" class="cta-button">
                Start Your First Game
              </a>
              
              <p><strong>Tips for the best experience:</strong></p>
              <ul>
                <li>Find a comfortable, private space with your partner</li>
                <li>Put away distractions and focus on each other</li>
                <li>Be honest and open in your responses</li>
                <li>Remember: there are no wrong answers, only opportunities to connect</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Thank you for joining Connection Cards!</p>
              <p>Questions? Reply to this email - we'd love to hear from you.</p>
            </div>
          </div>
        </body>
        </html>
      `,
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
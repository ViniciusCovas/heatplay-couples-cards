import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { AIAnalysisEmail } from '../_shared/email-templates/templates/AIAnalysisEmail.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisEmailRequest {
  roomId: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomId, language = 'en' }: AnalysisEmailRequest = await req.json();

    if (!roomId) {
      return new Response(
        JSON.stringify({ error: "Room ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing AI analysis email for room: ${roomId}`);

    // Get room data and host user
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('host_user_id, selected_language')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData?.host_user_id) {
      console.error('Room not found or no host:', roomError);
      return new Response(
        JSON.stringify({ error: "Room not found or no host user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user email from profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', roomData.host_user_id)
      .single();

    if (profileError || !profileData?.email) {
      console.error('User profile/email not found:', profileError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get AI analysis data (support both old and new analysis types for backwards compatibility)
    console.log(`Searching for AI analysis for room: ${roomId}`);
    const { data: analysisData, error: analysisError } = await supabase
      .from('ai_analyses')
      .select('ai_response, analysis_type')
      .eq('room_id', roomId)
      .in('analysis_type', ['getclose-ai-analysis', 'final_report'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) {
      console.error('Error fetching AI analysis:', analysisError);
      return new Response(
        JSON.stringify({ error: 'Database error while fetching analysis' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!analysisData) {
      console.error(`No AI analysis found for room: ${roomId}`);
      return new Response(
        JSON.stringify({ error: 'No AI analysis found for this room. Please generate an analysis first.' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Found AI analysis of type: ${analysisData.analysis_type}`);

    const analysis = analysisData.ai_response;
    const emailLanguage = language || roomData.selected_language || 'en';
    
    console.log(`Sending analysis email to: ${profileData.email} in language: ${emailLanguage}`);

    // Prepare email subject based on language
    const subjects = {
      en: 'Your Connection Cards AI Analysis Results 💕',
      es: 'Tus Resultados de Análisis IA de Connection Cards 💕',
      fr: 'Vos Résultats d\'Analyse IA Connection Cards 💕',
      pt: 'Seus Resultados de Análise IA do Connection Cards 💕'
    };

    const subject = subjects[emailLanguage as keyof typeof subjects] || subjects.en;

    // Render the email template
    const emailHtml = await renderAsync(
      React.createElement(AIAnalysisEmail, {
        userEmail: profileData.email,
        language: emailLanguage,
        analysisData: {
          compatibility_score: analysis.compatibilityScore || analysis.compatibility_score || 0,
          relationship_phase: analysis.relationshipPhase || analysis.relationship_phase || 'Discovery',
          strength_areas: analysis.strengthAreas || analysis.strength_areas || [],
          growth_areas: analysis.growthAreas || analysis.growth_areas || [],
          key_insights: analysis.keyInsights || analysis.key_insights || [],
          personalized_tips: analysis.personalizedTips || analysis.personalized_tips || [],
          cultural_notes: analysis.culturalNotes || analysis.cultural_notes || '',
          next_session_recommendation: analysis.nextSessionRecommendation || analysis.next_session_recommendation || ''
        }
      })
    );

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Connection Cards <onboarding@resend.dev>",
      to: [profileData.email],
      subject: subject,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('Failed to send email:', emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResponse.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "AI analysis email sent successfully",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-ai-analysis-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Processing game flow queue...')

    // Run technical-only auto recovery (no forced evaluations)
    const { error: recoveryError } = await supabase.rpc('auto_recover_technical_issues')
    if (recoveryError) {
      console.error('Error running technical recovery:', recoveryError)
    } else {
      console.log('Technical recovery completed successfully')
    }

    // Run disconnection detection (reduced frequency)
    const { error: disconnectionError } = await supabase.rpc('detect_disconnected_players')
    if (disconnectionError) {
      console.error('Error detecting disconnected players:', disconnectionError)
    } else {
      console.log('Disconnection detection completed successfully')
    }

    // Process the queue
    const { data: result, error } = await supabase.rpc('process_game_flow_queue')
    
    if (error) {
      console.error('Error processing queue:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Queue processing result:', result)

    // Also check for and fix stuck rooms
    const { data: stuckRoomsResult, error: stuckError } = await supabase.rpc('detect_and_fix_stuck_rooms')
    
    if (stuckError) {
      console.error('Error checking stuck rooms:', stuckError)
    } else {
      console.log('Stuck rooms check result:', stuckRoomsResult)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        queue_result: result,
        stuck_rooms_result: stuckRoomsResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
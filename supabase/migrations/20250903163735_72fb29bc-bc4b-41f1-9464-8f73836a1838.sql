-- Phase 2: Enhanced Edge Function for Real-Time Processing
-- Update the process-game-queue function to handle immediate processing

-- Also create real-time cron job for immediate processing (every 10 seconds)
SELECT cron.schedule(
  'realtime-game-queue-processor',
  '*/10 * * * * *', -- Every 10 seconds for real-time
  $$
  SELECT net.http_post(
    url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/process-game-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
    body := '{"realtime": true}'::jsonb
  );
  $$
);

-- Also create cron for disconnection detection every 30 seconds
SELECT cron.schedule(
  'detect-disconnected-players',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT public.detect_disconnected_players();
  $$
);
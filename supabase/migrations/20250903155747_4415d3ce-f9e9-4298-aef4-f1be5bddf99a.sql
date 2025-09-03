-- Set up automatic queue processing with cron
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule queue processing every 30 seconds
SELECT cron.schedule(
  'process-game-flow-queue',
  '*/30 * * * * *', -- every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/process-game-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
    body := '{"auto_process": true}'::jsonb
  ) as request_id;
  $$
);

-- Schedule stuck room detection every 2 minutes
SELECT cron.schedule(
  'detect-stuck-rooms',
  '0 */2 * * * *', -- every 2 minutes
  $$
  SELECT public.detect_and_fix_stuck_rooms();
  $$
);
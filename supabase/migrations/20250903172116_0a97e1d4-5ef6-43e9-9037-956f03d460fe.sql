-- Create a cron job to automatically run the recovery systems every 30 seconds
-- This ensures stuck rooms are automatically recovered and game flow is maintained

-- Create the cron job
SELECT cron.schedule(
  'auto-recovery-game-flow',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT
    net.http_post(
      url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/process-game-queue',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
      body := '{"auto_recovery": true}'::jsonb
    ) as request_id;
  $$
);
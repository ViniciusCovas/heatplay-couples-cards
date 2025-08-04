-- Enable required extensions for email functionality
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add activity tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to send welcome email via HTTP
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Make HTTP request to edge function
  PERFORM net.http_post(
    url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
    body := jsonb_build_object(
      'email', NEW.email,
      'user_id', NEW.id::text,
      'created_at', NEW.created_at::text
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for welcome emails on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_send_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_welcome_email_trigger();

-- Create function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity(user_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    last_seen = now(),
    last_login = now(),
    updated_at = now()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup weekly re-engagement email cron job
SELECT cron.schedule(
  'send-reengagement-emails',
  '0 10 * * 1', -- Every Monday at 10 AM
  $$
  SELECT net.http_post(
    url := 'https://bbdeyohqrutithaziulp.supabase.co/functions/v1/send-reengagement-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bbdeyohqrutithaziulp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGV5b2hxcnV0aXRoYXppdWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjM0MDcsImV4cCI6MjA2NzgzOTQwN30.hQOobohL9GanO4Wbf1zk-wp0tyvklJDEC8PMn6EPiog";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});